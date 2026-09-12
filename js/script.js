const letterButton = document.querySelector('#letterButton');
const letterBody = document.querySelector('#letterBody');
const heartButton = document.querySelector('#heartButton');
const heartText = document.querySelector('#heartText');

letterButton.addEventListener('click', () => {
    const isOpen = letterBody.classList.toggle('is-open');
    letterButton.innerHTML = isOpen ? 'Cerrar carta <span aria-hidden="true">×</span>' : 'Abrir carta <span aria-hidden="true">♡</span>';
});

heartButton.addEventListener('click', () => {
    const isLoved = heartButton.classList.toggle('loved');
    heartText.textContent = isLoved ? 'yo también te elijo' : 'te quiero';
});