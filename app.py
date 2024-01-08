import re
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

# Define a route for the home page
@app.route('/')
def home():
    return render_template('index.html')

@app.route("/register", methods=["GET", "POST"])
def register():
    """Register user"""
    if 'user_id' in session:
        # Redirect to home page
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

        # Remember which user has logged in
        session["user_id"] = result

        return redirect("/")
    else:
        return render_template("register.html")


# Run the application
if __name__ == '__main__':
    app.run(debug=True)