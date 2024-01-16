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

function toFixedTruncate(num) {
    let fixed = num >= 1 ? 2 : 8;
    let [whole, decimal] = num.toString().split('.');
    decimal = decimal || '';
    if (decimal.length > fixed) {
        decimal = decimal.substring(0, fixed);
    }
    return parseFloat(`${whole}.${decimal}`);
}

if (window.location.pathname.endsWith('trade')) {

    document.addEventListener('DOMContentLoaded', (event) => {
        const buyBtn = document.getElementById('buy-btn');
        const sellBtn = document.getElementById('sell-btn');
        const coinPriceDiv = document.getElementById('coin-price');
        const cashInput = document.getElementById('cash-input');
        const coinAmountDiv = document.getElementById('coin-amount');
        const actionBtn = document.getElementById('action-btn');

        let coinId, coinSymbol;
        let currentPrice = 0;

        $(document).ready(function() {
            $('#coin-select').select2();
        });

        cashInput.disabled = true;
        coinAmountDiv.disabled = true;

        $('#coin-select').on('select2:select', async (e) => {
            coinId = e.params.data.id;
            currentPrice = e.params.data.price;
            const response = await fetch(`https://api.coincap.io/v2/assets/${coinId}`);
            const data = await response.json();
            coinSymbol = data.data.symbol;
            currentPrice = parseFloat(toFixedTruncate(data.data.priceUsd, 8));
            coinPriceDiv.textContent = `Current Price: ${toFixedTruncate(currentPrice)}`;

            const response2 = await fetch(`/get_coin_amount?coin_id=${coinId}`);
            const data2 = await response2.json();
            const coinAmount = data2.coin_amount;

            const leftAmountDiv = document.querySelector('#coin-holdings');
            let formattedCoinAmount = Math.abs(coinAmount) < 0.0000005 ? 0.000000 : parseFloat(coinAmount).toFixed(6);
            leftAmountDiv.textContent = `You have ${formattedCoinAmount} ${coinSymbol}`;

            cashInput.disabled = false;
            coinAmountDiv.disabled = false;

            cashInput.value = '';
            coinAmountDiv.value = '';
        });

        let errorMessageDiv = document.getElementById('error-message');

        cashInput.addEventListener('input', () => {
            if (cashInput.value === '') {
                coinAmountDiv.value = '';
                errorMessageDiv.textContent = '';
                return;
            }

            const cash = parseFloat(cashInput.value);
            if (cash < 1) {
                errorMessageDiv.textContent = "Value must be at least $1";
                return;
            }

            const coinAmount = cash / currentPrice;
            coinAmountDiv.value = Number(coinAmount).toFixed(6);
            errorMessageDiv.textContent = '';
        });

        coinAmountDiv.addEventListener('input', () => {
            if (coinAmountDiv.value === '') {
                cashInput.value = '';
                return;
            }

            const coinAmount = parseFloat(coinAmountDiv.value);
            const cash = coinAmount * currentPrice;
            cashInput.value = `${toFixedTruncate(cash)}`;

            if (cash < 1) {
                errorMessageDiv.textContent = "Value must be at least $1";
                return;
            }

            errorMessageDiv.textContent = '';
        });

        buyBtn.addEventListener('click', () => {
            const sellButtonElements = document.querySelectorAll('.sell-button');

            sellButtonElements.forEach(element => {
                if (element.classList.contains('sell-button')) {
                    element.classList.remove('sell-button');
                    element.classList.add('buy-button');
                }
            });

            actionBtn.textContent = 'Buy';
        });

        sellBtn.addEventListener('click', async () => {
            const buyButtonElements = document.querySelectorAll('.buy-button');

            buyButtonElements.forEach(element => {
                if (element.classList.contains('buy-button')) {
                    element.classList.remove('buy-button');
                    element.classList.add('sell-button');
                }
            });

            const buyButton = document.querySelector('.buy-button');
            if (buyButton) {
                buyButton.textContent = 'Sell';
                buyButton.classList.remove('buy-button');
                buyButton.classList.add('sell-button');
            }

            actionBtn.textContent = 'Sell';
        });

        actionBtn.addEventListener('click', () => {
            if (cashInput.value < 1) {
                return;
            }
            
            const cash = cashInput.value;
            const coinAmount = coinAmountDiv.value;
            const isBuy = actionBtn.classList.contains('buy-button');

            const trade = {
                coinName: coinId.toLowerCase(),
                coinSymbol: coinSymbol,
                currentPrice: currentPrice,
                cash: cash,
                coinAmount: coinAmount,
                isBuy: isBuy
            };

            fetch('/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(trade)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/wallet';
                } else {
                    alert('Trade failed: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });

        });
    });
}


document.addEventListener('DOMContentLoaded', (event) => {
    if (window.location.pathname.endsWith('trade')) {
        setInterval(() => {
            const selectElement = document.querySelector('.select2');
            if (selectElement) {
                selectElement.classList.add('trade-primary');
            }
        }, 10);
    }
    
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