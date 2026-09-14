const supabaseUrl = 'https://spzmjigoasqwvpvhlrrq.supabase.co';
const supabaseKey = 'sb_publishable_YPZo0GS3Cfz_Xp6JE9ol9A_37rzZYtf';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

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

const guestForm = document.querySelector('#guestForm');
if (guestForm) {
    const guestText = document.querySelector('#guestText');
    const guestPhotoInput = document.querySelector('#guestPhotoInput');
    const guestPhotoLabel = document.querySelector('#guestPhotoLabel');
    const guestPhotoPreview = document.querySelector('#guestPhotoPreview');
    const guestStatus = document.querySelector('#guestStatus');
    let compressedPhoto = null;

    guestPhotoInput.addEventListener('change', async () => {
        const [photo] = guestPhotoInput.files;
        if (!photo) return;

        guestPhotoLabel.textContent = photo.name;
        guestStatus.textContent = 'Optimizando la foto...';
        try {
            compressedPhoto = await compressPhoto(photo);
            guestPhotoPreview.innerHTML = `<img src="${compressedPhoto}" alt="Vista previa del recuerdo">`;
            guestStatus.textContent = 'Foto lista para enviar.';
        } catch (error) {
            guestStatus.textContent = error.message;
        }
    });

    guestForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!compressedPhoto) {
            guestStatus.textContent = 'Selecciona una foto antes de enviar.';
            return;
        }

        guestStatus.textContent = 'Enviando recuerdo...';
        const photoBlob = await fetch(compressedPhoto).then((response) => response.blob());
        const photoPath = `recuerdos/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabaseClient.storage
            .from('fotos')
            .upload(photoPath, photoBlob, { contentType: 'image/webp', upsert: false });

        if (uploadError) {
            guestStatus.textContent = `No se pudo subir la foto: ${uploadError.message}`;
            return;
        }

        const photoUrl = supabaseClient.storage.from('fotos').getPublicUrl(photoPath).data.publicUrl;
        const { error: saveError } = await supabaseClient.from('recuerdos').insert({
            texto: guestText.value,
            foto_url: photoUrl
        });

        if (saveError) {
            guestStatus.textContent = `No se pudo guardar el recuerdo: ${saveError.message}`;
            return;
        }

        guestForm.reset();
        compressedPhoto = null;
        guestPhotoPreview.innerHTML = '';
        guestPhotoLabel.textContent = 'Elegir una foto';
        guestStatus.textContent = 'Recuerdo enviado. Ya no se puede modificar desde aquí.';
    });
}

const memoriesList = document.querySelector('#memoriesList');
if (memoriesList) {
    async function loadMemories() {
        const { data: memories, error } = await supabaseClient
            .from('recuerdos')
            .select('id, texto, foto_url, creado_en')
            .order('creado_en', { ascending: false });

        if (error) {
            memoriesList.innerHTML = '<p class="memory-status">No se pudieron cargar los recuerdos.</p>';
            return;
        }

        if (!memories.length) {
            memoriesList.innerHTML = '<p class="memory-status">Todavía no hay recuerdos.</p>';
            return;
        }

        memoriesList.innerHTML = memories.map((memory) => `
            <article class="memory-item">
                ${memory.foto_url ? `<img src="${memory.foto_url}" alt="Foto de un recuerdo compartido">` : ''}
                <div>
                    <p>${escapeHtml(memory.texto || '')}</p>
                    <time datetime="${memory.creado_en}">${new Date(memory.creado_en).toLocaleDateString('es-ES')}</time>
                </div>
            </article>
        `).join('');
    }

    supabaseClient
        .channel('recuerdos-publicos')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recuerdos' }, loadMemories)
        .subscribe();
    loadMemories();
}

function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[character]));
}
