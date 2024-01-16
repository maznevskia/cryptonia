import re
import requests
from cs50 import SQL
from flask import Flask, flash, redirect, render_template, request, session, url_for, jsonify
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash
from decimal import Decimal, ROUND_DOWN

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

@app.route('/trade', methods=['GET', 'POST'])
def trade():
    """Trade cryptocurrencies"""
    if "user_id" not in session:
        return redirect(url_for("login"))

    user_id = session["user_id"]

    cash = db.execute("SELECT cash FROM users WHERE id = ?", user_id)

    if request.method == 'POST':
        trade = request.get_json()

        if not trade:
            return jsonify({'success': False, 'error': 'No trade data provided'}), 400
        if 'coinName' not in trade:
            return jsonify({'success': False, 'error': 'Missing coinName in trade data'}), 400
        if 'cash' not in trade:
            return jsonify({'success': False, 'error': 'Missing cash in trade data'}), 400
        if 'coinAmount' not in trade:
            return jsonify({'success': False, 'error': 'Missing coinAmount in trade data'}), 400
        if 'isBuy' not in trade:
            return jsonify({'success': False, 'error': 'Missing isBuy in trade data'}), 400

        if trade['isBuy']:
            if round(float(cash[0]['cash']), 2) < float(trade['cash']):
                return jsonify({'success': False, 'error': 'Insufficient cash'}), 400

            db.execute("INSERT INTO transactions (user_id, name, crypto_symbol, amount, transaction_type, purchase_price, transaction_date) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))", user_id, trade['coinName'], trade['coinSymbol'], int(float(trade['coinAmount']) * 10**6) / 10**6, 'buy', trade['currentPrice'])
            db.execute("UPDATE users SET cash = cash - ? WHERE id = ?", int(float(trade['cash']) * 10**2) / 10**2, user_id)
        else:
            transactions = db.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND name = ?", user_id, trade['coinName'])
            if not transactions or round(transactions[0]['total'], 6) < float(trade['coinAmount']):
                return jsonify({'success': False, 'error': 'Insufficient coins'}), 400

            db.execute("UPDATE users SET cash = cash + ? WHERE id = ?", int(float(trade['cash']) * 10**2) / 10**2, user_id)
            db.execute("INSERT INTO transactions (user_id, name, crypto_symbol, amount, transaction_type, purchase_price, transaction_date) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))", user_id, trade['coinName'], trade['coinSymbol'], -1 * int(float(trade['coinAmount']) * 10**6) / 10**6, 'sell', trade['currentPrice'])

        return jsonify({'success': True}), 200
    else:
        response = requests.get('https://api.coincap.io/v2/assets?limit=200')
        coins = response.json()['data']

        return render_template('trade.html', coins=coins, cash=cash)

@app.route('/get_coin_amount', methods=['GET'])
def get_coin_amount():
    coin_id = request.args.get('coin_id')
    user_id = session["user_id"]

    if not coin_id:
        return jsonify({'error': 'Missing coin_id'}), 400

    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400

    rows = db.execute(
        'SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND name = ?',
        user_id, coin_id,)
    row = rows[0] if rows else None
    coin_amount = row['total'] if row['total'] else 0

    return jsonify({'coin_amount': coin_amount})

@app.route("/wallet")
def wallet():
    """Display user's wallet"""
    if "user_id" not in session:
        return redirect(url_for("login"))
    
    user_id = session["user_id"]

    crypto_names = db.execute("SELECT DISTINCT name FROM transactions WHERE user_id = ?", user_id)

    wallet = []
    for symbol in crypto_names:


        bought_amount = db.execute("SELECT ROUND(SUM(amount), 6) as total FROM transactions WHERE user_id = ? AND name = ? AND transaction_type = 'buy'", user_id, symbol['name'])
        bought_amount = bought_amount[0]['total'] if bought_amount[0]['total'] else 0

        sold_amount = db.execute("SELECT ROUND(SUM(amount), 6) as total FROM transactions WHERE user_id = ? AND name = ? AND transaction_type = 'sell'", user_id, symbol['name'])
        sold_amount = sold_amount[0]['total'] if sold_amount[0]['total'] else 0

        bought_amount_decimal = Decimal(str(bought_amount)).quantize(Decimal('0.000001'), rounding=ROUND_DOWN)
        sold_amount_decimal = Decimal(str(sold_amount)).quantize(Decimal('0.000001'), rounding=ROUND_DOWN)

        current_amount_decimal = bought_amount_decimal + sold_amount_decimal
        current_amount = float(current_amount_decimal)
        
        if current_amount > 0:
            response = requests.get(f'https://api.coincap.io/v2/assets/{symbol["name"]}')
            coin_data = response.json()
            coin = coin_data['data']

            coin['holdings'] = current_amount
            current_amount_decimal = Decimal(str(current_amount))
            price_decimal = Decimal(str(coin['priceUsd']))
            total_value_decimal = current_amount_decimal * price_decimal
            coin['total_value'] = float(total_value_decimal)

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