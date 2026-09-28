const supabaseUrl = 'https://spzmijgoasqwvpvhlrrq.supabase.co';
const supabaseKey = 'sb_publishable_YPZo0GS3Cfz_Xp6JE9ol9A_37rzZYtf';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

async function registerPageVisit(page) {
    const { error } = await supabaseClient.functions.invoke('registrar-visita', { body: { pagina: page } });
    if (error) console.info('El registro de visitas estará disponible al publicar la función de Supabase.');
}

function compressPhoto(photo) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const imageUrl = URL.createObjectURL(photo);
        image.addEventListener('load', () => {
            const scale = Math.min(1, 1600 / image.width);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(imageUrl);
            resolve(canvas.toDataURL('image/webp', .8));
        });
        image.addEventListener('error', () => { URL.revokeObjectURL(imageUrl); reject(new Error('No se pudo procesar la foto.')); });
        image.src = imageUrl;
    });
}

const guestForm = document.querySelector('#guestForm');
registerPageVisit(guestForm ? 'enviar' : 'recuerdos');

if (guestForm) {
    const guestText = document.querySelector('#guestText');
    const guestPhotoInput = document.querySelector('#guestPhotoInput');
    const guestPhotoLabel = document.querySelector('#guestPhotoLabel');
    const guestPhotoPreview = document.querySelector('#guestPhotoPreview');
    const guestStatus = document.querySelector('#guestStatus');
    const submitButton = guestForm.querySelector('[type="submit"]');
    let compressedPhoto = null;

    guestPhotoInput.addEventListener('change', async () => {
        const [photo] = guestPhotoInput.files;
        compressedPhoto = null;
        guestPhotoPreview.innerHTML = '';
        if (!photo) { guestPhotoLabel.textContent = 'Elegir una foto'; return; }
        guestPhotoLabel.textContent = photo.name;
        guestStatus.textContent = 'Optimizando la foto...';
        try {
            compressedPhoto = await compressPhoto(photo);
            guestPhotoPreview.innerHTML = `<img src="${compressedPhoto}" alt="Vista previa del recuerdo">`;
            guestStatus.textContent = 'Foto lista para enviar.';
        } catch (error) { guestStatus.textContent = error.message; }
    });

    guestForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const texto = guestText.value.trim();
        if (!texto && !compressedPhoto) {
            guestStatus.textContent = 'Agrega un mensaje, una foto o ambos antes de enviar.';
            return;
        }
        submitButton.disabled = true;
        guestStatus.textContent = 'Enviando recuerdo...';
        let photoUrl = null;
        if (compressedPhoto) {
            const photoBlob = await fetch(compressedPhoto).then((response) => response.blob());
            const photoPath = `recuerdos/${crypto.randomUUID()}.webp`;
            const { error: uploadError } = await supabaseClient.storage.from('fotos').upload(photoPath, photoBlob, { contentType: 'image/webp', upsert: false });
            if (uploadError) {
                submitButton.disabled = false;
                guestStatus.textContent = `No se pudo subir la foto: ${uploadError.message}`;
                return;
            }
            photoUrl = supabaseClient.storage.from('fotos').getPublicUrl(photoPath).data.publicUrl;
        }
        const { error } = await supabaseClient.from('recuerdos').insert({ texto, ...(photoUrl ? { foto_url: photoUrl } : {}) });
        submitButton.disabled = false;
        if (error) { guestStatus.textContent = `No se pudo guardar el recuerdo: ${error.message}`; return; }
        guestForm.reset();
        compressedPhoto = null;
        guestPhotoPreview.innerHTML = '';
        guestPhotoLabel.textContent = 'Elegir una foto';
        guestStatus.textContent = 'Recuerdo enviado.';
    });
}

const memoriesList = document.querySelector('#memoriesList');
if (memoriesList) {
    async function loadMemories() {
        const { data: memories, error } = await supabaseClient.from('recuerdos').select('id, texto, foto_url, creado_en').order('creado_en', { ascending: false });
        if (error) { memoriesList.innerHTML = '<p class="memory-status">No se pudieron cargar los recuerdos.</p>'; return; }
        if (!memories.length) { memoriesList.innerHTML = '<p class="memory-status">Todavía no hay recuerdos.</p>'; return; }
        memoriesList.innerHTML = memories.map((memory) => `<article class="memory-item">${memory.foto_url ? `<img src="${escapeHtml(memory.foto_url)}" alt="Foto de un recuerdo compartido">` : ''}<div>${memory.texto ? `<p>${escapeHtml(memory.texto)}</p>` : '<p>Un recuerdo en imagen.</p>'}<time datetime="${escapeHtml(memory.creado_en)}">${new Date(memory.creado_en).toLocaleDateString('es-PE')}</time></div></article>`).join('');
    }
    supabaseClient.channel('recuerdos-publicos').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recuerdos' }, loadMemories).subscribe();
    loadMemories();
}
