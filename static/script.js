document.addEventListener('DOMContentLoaded', (event) => {
    const copyrightElement = document.getElementById('copyright');
    if (copyrightElement) {
        copyrightElement.textContent += ' ' + new Date().getFullYear();
    }
});

var acc = document.getElementsByClassName("accordion");

for (var i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
        var currentlyActive = document.querySelector('.accordion.active');
        if (currentlyActive && currentlyActive !== this) {
            currentlyActive.classList.remove('active');
            currentlyActive.nextElementSibling.style.maxHeight = null;
            currentlyActive.querySelector('.toggle-icon').textContent = '+';
        }

        this.classList.toggle("active");
        var panel = this.nextElementSibling;
        if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
            this.querySelector('.toggle-icon').textContent = '+';
        } else {
            panel.style.maxHeight = panel.scrollHeight + "px";
            this.querySelector('.toggle-icon').textContent = '-';
        }
    });
}

setInterval(function() {
    fetch('https://api.coincap.io/v2/assets')
        .then(response => response.json())
        .then(data => {
            const coins = data.data.slice(0, 5);
            const tableBody = document.querySelector('.index-table tbody');
            if (tableBody) {
                tableBody.innerHTML = '';
                for (const coin of coins) {
                    const row = document.createElement('tr');
                    const logoCell = document.createElement('td');
                    const logo = document.createElement('img');
                    logo.src = `https://cryptologos.cc/logos/${coin.id}-${coin.symbol.toLowerCase()}-logo.png`;
                    logo.onerror = function() { this.src = '/static/cryptoniaLogo.png'; };
                    logo.className = 'coin-image';
                    logoCell.appendChild(logo);
                    logoCell.appendChild(document.createTextNode(' '));
                    logoCell.appendChild(document.createTextNode(coin.symbol));
                    row.appendChild(logoCell);
                    const priceCell = document.createElement('td');
                    priceCell.textContent = `$${Number(coin.priceUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    row.appendChild(priceCell);
                    const changeCell = document.createElement('td');
                    const changeSpan = document.createElement('span');
                    changeSpan.textContent = `${parseFloat(coin.changePercent24Hr).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
                    changeSpan.className = coin.changePercent24Hr > 0 ? 'change-positive' : 'change-negative';
                    changeCell.appendChild(changeSpan);
                    row.appendChild(changeCell);
                    tableBody.appendChild(row);
                }
            }
        });
}, 5000);

if (window.location.pathname.endsWith('transactions.html')) {
    document.body.classList.add('transactions-page');
}

document.addEventListener('DOMContentLoaded', (event) => {
    $('#transactionsTable').DataTable({
        "order": [[ 3, "desc" ]]
    });
});

$(document).ready(function() {
    $('#marketsTable').DataTable();
});

function formatNumber(num) {
    if (num >= 1.0e+12) {
        return (num / 1.0e+12).toFixed(2) + "T";
    } else if (num >= 1.0e+9) {
        return (num / 1.0e+9).toFixed(2) + "B";
    } else if (num >= 1.0e+6) {
        return (num / 1.0e+6).toFixed(2) + "M";
    } else if (num >= 1.0e+3) {
        return (num / 1.0e+3).toFixed(2) + "K";
    } else {
        return num.toFixed(2);
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
    $('#marketsTable').DataTable({
        "order": [[ 4, "desc" ]],
        "columnDefs": [
            {
                "targets": [3, 4],
                "render": function(data, type, row) {
                    var cleanData = data.replace(/[^0-9.]/g, '');
                    var numberData = parseFloat(cleanData);
                    if (type === 'display') {
                        return formatNumber(numberData);
                    } else {
                        return numberData;
                    }
                }
            }
        ]
    });
});

document.addEventListener('DOMContentLoaded', (event) => {
    const updateTransactions = () => {
        const transactionsTable = document.querySelector('.transactions-table tbody');
        if (transactionsTable) {
            fetch('/transactions')
                .then(response => response.json())
                .then(transactions => {
                    transactionsTable.innerHTML = '';
                    for (const transaction of transactions) {
                        const row = document.createElement('tr');
                        const dateCell = document.createElement('td');
                        dateCell.textContent = transaction.date;
                        row.appendChild(dateCell);
                        const nameCell = document.createElement('td');
                        nameCell.textContent = transaction.name;
                        row.appendChild(nameCell);
                        const typeCell = document.createElement('td');
                        typeCell.textContent = transaction.transaction_type;
                        row.appendChild(typeCell);
                        const amountCell = document.createElement('td');
                        amountCell.textContent = (transaction.transaction_type === 'buy' ? '+' : '-') + transaction.amount;
                        amountCell.className = transaction.transaction_type === 'buy' ? 'transaction-positive' : 'transaction-negative';
                        row.appendChild(amountCell);
                        transactionsTable.appendChild(row);
                    }
                });
        }
    };

    updateTransactions();
});