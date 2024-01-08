# Cryptonia
#### Video Demo:  <URL HERE>
#### Description:
Create a Layout
    Create Header with links to Home, Markets, Trade, Wallet and Logout or Login/Register
    Create a Footer with current year, name of application and links
Setup Register
    Setup hashing algoritham
    Users need to register with a non-existent username, password (8-32 characters) and confirm their password
    Create Databases for users(ID, email, password(hashed) and cash)
Setup Login
Setup Logout
Create a Landing Page
Create a Markets Page
Create a Trade Page
Create a Wallet Page
    Create Transaction History section (CREATE TABLE transactions (id INTEGER PRIMARY KEY, user_id INTEGER, crypto_symbol TEXT, transaction_type TEXT, amount REAL, transaction_date TEXT, FOREIGN KEY(user_id) REFERENCES users(id));)