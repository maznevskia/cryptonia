import re
import requests
from cs50 import SQL
from flask import Flask, flash, redirect, render_template, request, session, url_for
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

db = SQL("sqlite:///cryptonia.db")


@app.after_request
def after_request(response):
    """Ensure responses aren't cached"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


@app.route('/')
def home():
    response = requests.get('https://api.coincap.io/v2/assets')
    data = response.json()
    coins = data['data'][:5]
    return render_template('index.html', coins=coins)

@app.route('/markets')
def markets():
    response = requests.get('https://api.coincap.io/v2/assets?limit=200')
    data = response.json()
    return render_template('markets.html', coins=data['data'])

@app.route("/wallet")
def wallet():
    """Display user's wallet"""
    if "user_id" not in session:
        return redirect(url_for("login"))
    
    user_id = session["user_id"]

    crypto_names = db.execute("SELECT DISTINCT name FROM transactions WHERE user_id = ?", user_id)

    wallet = []
    for symbol in crypto_names:


        bought_amount = db.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND name = ? AND transaction_type = 'buy'", user_id, symbol['name'])
        bought_amount = bought_amount[0]['total'] if bought_amount[0]['total'] else 0

        sold_amount = db.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND name = ? AND transaction_type = 'sell'", user_id, symbol['name'])
        sold_amount = sold_amount[0]['total'] if sold_amount[0]['total'] else 0

        current_amount = bought_amount - sold_amount


        if current_amount > 0:
            response = requests.get(f'https://api.coincap.io/v2/assets/{symbol["name"]}')
            coin_data = response.json()
            coin = coin_data['data']
    
            coin['holdings'] = current_amount
            coin['total_value'] = current_amount * float(coin['priceUsd'])
    
            wallet.append(coin)
            

    return render_template("wallet.html", wallet=wallet)

@app.route("/transactions")
def transactions():
    """Display user's transactions"""
    if "user_id" not in session:
        return redirect(url_for("login"))
    
    user_id = session["user_id"]

    transactions = db.execute("SELECT * FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC", user_id)

    return render_template("transactions.html", transactions=transactions)


@app.route("/register", methods=["GET", "POST"])
def register():
    """Register user"""
    if 'user_id' in session:
        return redirect(url_for('home'))
    
    elif request.method == "POST":
        def apology(message, code):
            """Render an apology to the user."""
            flash(message)
            email = request.form.get("email")
            if email and '@' in email and '.' in email:
                return render_template('register.html', email=email), code
            else:
                return render_template('register.html'), code

        if not request.form.get("email"):
            return apology("Must provide email address", 400)

        rows = db.execute(
            "SELECT * FROM users WHERE email = ?", request.form.get("email"))
        
        if len(rows) > 0:
            return apology("Email already exists", 400)
        
        if not re.match(r"[^@]+@[^@]+\.[^@]+", request.form.get("email")):
            return apology("Invalid email address", 400)

        elif not request.form.get("password"):
            return apology("Must provide password", 400)

        elif len(request.form.get("password")) < 8:
            return apology("Password must be at least 8 characters", 400)

        elif not request.form.get("confirmation"):
            return apology("Must confirm password", 400)

        elif request.form.get("password") != request.form.get("confirmation"):
            return apology("Password and confirmation must match", 400)

        result = db.execute(
            "INSERT INTO users (email, hash) VALUES (?, ?)",
            request.form.get("email"),
            generate_password_hash(request.form.get("password")))

        session["user_id"] = result

        return redirect("/")
    else:
        return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    """Log user in"""

    session.clear()

    if request.method == "POST":

        def apology(message, code):
            """Render an apology to the user."""
            flash(message)
            return render_template('login.html'), code

        if not request.form.get("email"):
            return apology("Must provide email", 400)

        elif not request.form.get("password"):
            return apology("Must provide password", 400)

        rows = db.execute(
            "SELECT * FROM users WHERE email = ?", request.form.get("email"))

        if len(rows) != 1 or not check_password_hash(rows[0]["hash"], request.form.get("password")):
            return apology("Invalid email and/or password", 400)

        session["user_id"] = rows[0]["id"]

        return redirect("/")

    else:
        return render_template("login.html")


@app.route("/logout")
def logout():
    """Log user out"""

    session.clear()

    return redirect("/")

if __name__ == '__main__':
    app.run(debug=True)