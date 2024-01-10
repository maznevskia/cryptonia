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
    fetch('https://api.coinlore.net/api/tickers/')
        .then(response => response.json())
        .then(data => {
            const coins = data.data.slice(0, 5);
            const tableBody = document.querySelector('.index-table tbody');
            tableBody.innerHTML = '';
            for (const coin of coins) {
                const row = document.createElement('tr');
                const logoCell = document.createElement('td');
                const logo = document.createElement('img');
                logo.src = `https://cryptologos.cc/logos/${coin.name.replace(' ', '-').toLowerCase()}-${coin.symbol.toLowerCase()}-logo.png`;
                logo.onerror = function() { this.src = 'usd-coin-usdc-logo.png'; };
                logo.className = 'coin-image';
                logoCell.appendChild(logo);
                logoCell.appendChild(document.createTextNode(' '));
                logoCell.appendChild(document.createTextNode(coin.symbol));
                row.appendChild(logoCell);
                const priceCell = document.createElement('td');
                priceCell.textContent = `$${Number(coin.price_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                row.appendChild(priceCell);
                const changeCell = document.createElement('td');
                const changeSpan = document.createElement('span');
                changeSpan.textContent = `${coin.percent_change_24h}%`;
                changeSpan.className = coin.percent_change_24h > 0 ? 'change-positive' : 'change-negative';
                changeCell.appendChild(changeSpan);
                row.appendChild(changeCell);
                tableBody.appendChild(row);
            }
        });
}, 5000);