var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
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