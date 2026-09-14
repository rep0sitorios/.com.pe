const letterButton = document.querySelector('#letterButton');
const letterBody = document.querySelector('#letterBody');
const heartButton = document.querySelector('#heartButton');
const heartText = document.querySelector('#heartText');
const memoryText = document.querySelector('#memoryText');
const memorySave = document.querySelector('#memorySave');
const memoryDownload = document.querySelector('#memoryDownload');
const memoryStatus = document.querySelector('#memoryStatus');
const photoInput = document.querySelector('#photoInput');
const photoLabel = document.querySelector('#photoLabel');
const photoPreview = document.querySelector('#photoPreview');
const adminLogin = document.querySelector('#adminLogin');
const adminEmail = document.querySelector('#adminEmail');
const adminPassword = document.querySelector('#adminPassword');
const loginStatus = document.querySelector('#loginStatus');
const memoryTools = document.querySelector('#memoryTools');
const memorySection = document.querySelector('#recuerdo');
const memorySelect = document.querySelector('#memorySelect');
const letterSalutation = document.querySelector('#letterSalutation');
const letterParagraphOne = document.querySelector('#letterParagraphOne');
const letterParagraphTwo = document.querySelector('#letterParagraphTwo');
const letterSalutationInput = document.querySelector('#letterSalutationInput');
const letterParagraphOneInput = document.querySelector('#letterParagraphOneInput');
const letterParagraphTwoInput = document.querySelector('#letterParagraphTwoInput');
const letterSave = document.querySelector('#letterSave');
const letterStatus = document.querySelector('#letterStatus');
let selectedPhoto = null;
let currentMemoryId = null;

const isAdminRoute = window.location.hash === '#admin' || window.location.pathname.endsWith('/admin.html');
if (!isAdminRoute) memorySection.hidden = true;

const supabaseUrl = 'https://spzmjigoasqwvpvhlrrq.supabase.co';
const supabaseKey = 'sb_publishable_YPZo0GS3Cfz_Xp6JE9ol9A_37rzZYtf';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

async function loadLetterContent() {
    const { data: letter, error } = await supabaseClient
        .from('contenido_sitio')
        .select('saludo, parrafo_uno, parrafo_dos')
        .eq('id', true)
        .maybeSingle();
    if (error || !letter) return;

    if (letterSalutation) letterSalutation.textContent = letter.saludo;
    if (letterParagraphOne) letterParagraphOne.textContent = letter.parrafo_uno;
    if (letterParagraphTwo) letterParagraphTwo.textContent = letter.parrafo_dos;
    if (letterSalutationInput) letterSalutationInput.value = letter.saludo;
    if (letterParagraphOneInput) letterParagraphOneInput.value = letter.parrafo_uno;
    if (letterParagraphTwoInput) letterParagraphTwoInput.value = letter.parrafo_dos;
}

loadLetterContent();

function compressPhoto(photo) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const imageUrl = URL.createObjectURL(photo);

        image.addEventListener('load', () => {
            const maxWidth = 1600;
            const scale = Math.min(1, maxWidth / image.width);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(imageUrl);
            resolve(canvas.toDataURL('image/webp', .8));
        });

        image.addEventListener('error', () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('No se pudo procesar la foto.'));
        });
        image.src = imageUrl;
    });
}

const savedMemory = localStorage.getItem('memoryText');
if (savedMemory) memoryText.value = savedMemory;

function showMemory(memory) {
    if (!memory) return;

    currentMemoryId = memory.id;
    memoryText.value = memory.texto || '';
    photoPreview.innerHTML = memory.foto_url
        ? `<img src="${memory.foto_url}" alt="Foto guardada en nuestro recuerdo">`
        : '';
    photoLabel.textContent = memory.foto_url ? 'Foto guardada' : 'Elegir una foto';
    selectedPhoto = null;
}

async function loadSavedMemory() {
    try {
        const { data: memories, error } = await supabaseClient
            .from('recuerdos')
            .select('id, texto, foto_url, creado_en')
            .order('creado_en', { ascending: false });
        if (error || !memories?.length) return;

        if (memorySelect) {
            memorySelect.innerHTML = memories.map((memory, index) => {
                const date = new Date(memory.creado_en).toLocaleDateString('es-ES');
                return `<option value="${memory.id}">Recuerdo ${memories.length - index} · ${date}</option>`;
            }).join('');
        }
        showMemory(memories[0]);
    } catch (error) {
        console.error('No se pudo cargar el recuerdo:', error);
    }
}

loadSavedMemory();

supabaseClient
    .channel('recuerdos-en-vivo')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recuerdos' }, loadSavedMemory)
    .subscribe();

async function showAdminPanel() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        memoryTools.hidden = false;
        adminLogin.hidden = true;
    }
}

showAdminPanel();

if (memorySelect) {
    memorySelect.addEventListener('change', async () => {
        const { data: memory, error } = await supabaseClient
            .from('recuerdos')
            .select('id, texto, foto_url, creado_en')
            .eq('id', memorySelect.value)
            .single();
        if (!error) showMemory(memory);
    });
}

adminLogin.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginStatus.textContent = 'Comprobando acceso...';
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: adminEmail.value.trim(),
        password: adminPassword.value
    });

    if (error) {
        const errorMessages = {
            'Invalid login credentials': 'El correo o la contraseña no coinciden.',
            'Email not confirmed': 'Debes confirmar el correo del usuario en Supabase.',
            'Too many requests': 'Demasiados intentos. Espera unos minutos y vuelve a probar.'
        };
        loginStatus.textContent = errorMessages[error.message] || `No se pudo iniciar sesión: ${error.message}`;
        return;
    }

    adminLogin.hidden = true;
    memoryTools.hidden = false;
    loginStatus.textContent = '';
});

photoInput.addEventListener('change', async () => {
    const [photo] = photoInput.files;
    if (!photo) return;

    photoLabel.textContent = photo.name;
    memoryStatus.textContent = 'Optimizando la foto...';

    try {
        const compressedPhoto = await compressPhoto(photo);
        selectedPhoto = {
            nombre: photo.name,
            tipo: 'image/webp',
            contenido: compressedPhoto
        };
        photoPreview.innerHTML = `<img src="${compressedPhoto}" alt="Foto elegida para nuestro recuerdo">`;
        memoryStatus.textContent = 'Foto optimizada y lista para guardar.';
    } catch (error) {
        memoryStatus.textContent = error.message;
    }
});

memorySave.addEventListener('click', async () => {
    memoryStatus.textContent = 'Guardando recuerdo...';
    let photoUrl = null;

    if (selectedPhoto?.contenido) {
        const photoBlob = await fetch(selectedPhoto.contenido).then((response) => response.blob());
        const photoPath = `recuerdos/${Date.now()}.webp`;
        const { error: uploadError } = await supabaseClient.storage
            .from('fotos')
            .upload(photoPath, photoBlob, { contentType: 'image/webp', upsert: false });

        if (uploadError) {
            memoryStatus.textContent = `No se pudo subir la foto: ${uploadError.message}`;
            return;
        }
        photoUrl = supabaseClient.storage.from('fotos').getPublicUrl(photoPath).data.publicUrl;
    }

    const memoryData = {
        texto: memoryText.value,
        ...(photoUrl ? { foto_url: photoUrl } : {})
    };
    const saveRequest = currentMemoryId
        ? supabaseClient.from('recuerdos').update(memoryData).eq('id', currentMemoryId)
        : supabaseClient.from('recuerdos').insert(memoryData);
    const { error: saveError } = await saveRequest;

    memoryStatus.textContent = saveError
        ? `No se pudo guardar el texto: ${saveError.message}`
        : 'Recuerdo guardado en Supabase.';
});

memoryDownload.addEventListener('click', () => {
    const memory = {
        texto: memoryText.value,
        foto: selectedPhoto,
        guardadoEn: new Date().toISOString()
    };
    const json = JSON.stringify(memory, null, 2);
    const file = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(file);
    link.download = 'nuestro-recuerdo.json';
    link.click();
    URL.revokeObjectURL(link.href);
    memoryStatus.textContent = 'El archivo JSON se descargó correctamente.';
});

if (letterButton) {
    letterButton.addEventListener('click', () => {
        const isOpen = letterBody.classList.toggle('is-open');
        letterButton.innerHTML = isOpen ? 'Cerrar carta <span aria-hidden="true">×</span>' : 'Abrir carta <span aria-hidden="true">♡</span>';
    });
}

if (heartButton) {
    heartButton.addEventListener('click', () => {
        const isLoved = heartButton.classList.toggle('loved');
        heartText.textContent = isLoved ? 'yo también te elijo' : 'te quiero';
    });
}

if (letterSave) {
    letterSave.addEventListener('click', async () => {
        letterStatus.textContent = 'Guardando carta...';
        const { error } = await supabaseClient
            .from('contenido_sitio')
            .update({
                saludo: letterSalutationInput.value,
                parrafo_uno: letterParagraphOneInput.value,
                parrafo_dos: letterParagraphTwoInput.value,
                actualizado_en: new Date().toISOString()
            })
            .eq('id', true);

        letterStatus.textContent = error
            ? `No se pudo guardar la carta: ${error.message}`
            : 'Carta actualizada correctamente.';
    });
}