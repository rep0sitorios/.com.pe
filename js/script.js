const supabaseUrl = 'https://spzmijgoasqwvpvhlrrq.supabase.co';
const supabaseKey = 'sb_publishable_YPZo0GS3Cfz_Xp6JE9ol9A_37rzZYtf';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
const isAdminRoute = window.location.pathname.endsWith('/admin.html');
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const formatDate = (value) => new Date(value).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
const formatDateTime = (value) => new Date(value).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });

async function registerPageVisit(page) {
    const { error } = await supabaseClient.functions.invoke('registrar-visita', { body: { pagina: page } });
    if (error) console.info('El registro de visitas estará disponible al publicar la función de Supabase.');
}

async function loadLetterContent() {
    const { data: letter } = await supabaseClient.from('contenido_sitio').select('saludo, parrafo_uno, parrafo_dos').eq('id', true).maybeSingle();
    if (!letter) return;
    [['#letterSalutation', letter.saludo], ['#letterParagraphOne', letter.parrafo_uno], ['#letterParagraphTwo', letter.parrafo_dos], ['#letterSalutationInput', letter.saludo], ['#letterParagraphOneInput', letter.parrafo_uno], ['#letterParagraphTwoInput', letter.parrafo_dos]].forEach(([selector, value]) => {
        const element = $(selector);
        if (!element) return;
        if (element.matches('input, textarea')) element.value = value;
        else element.textContent = value;
    });
}

const storyLetters = $('#storyLetters');
function setStoryLetterControls() {
    storyLetters?.querySelectorAll('.story-letter-content').forEach((content) => {
        const toggle = content.parentElement.querySelector('.story-letter-toggle');
        if (toggle) toggle.hidden = content.scrollHeight <= content.clientHeight + 1;
    });
}
async function loadStoryLetters() {
    if (!storyLetters) return;
    const { data: letters, error } = await supabaseClient.from('cartas_centro').select('id, titulo, contenido, creado_en').order('creado_en', { ascending: false }).limit(12);
    if (error) {
        storyLetters.innerHTML = '<p class="memory-status">Las cartas aparecerán aquí cuando estén listas.</p>';
        return;
    }
    if (!letters.length) {
        storyLetters.innerHTML = '<p class="memory-status">Todavía no hay cartas guardadas en este pedacito de mundo.</p>';
        return;
    }
    storyLetters.innerHTML = letters.map((letter) => `<article class="story-letter"><h3 class="story-letter-title">${escapeHtml(letter.titulo)}</h3><time datetime="${escapeHtml(letter.creado_en)}">${formatDate(letter.creado_en)}</time><p class="story-letter-content">${escapeHtml(letter.contenido)}</p><button class="story-letter-toggle" type="button" hidden aria-expanded="false">Leer más</button></article>`).join('');
    requestAnimationFrame(setStoryLetterControls);
}
storyLetters?.addEventListener('click', (event) => {
    const button = event.target.closest('.story-letter-toggle');
    if (!button) return;
    const content = button.parentElement.querySelector('.story-letter-content');
    const expanded = content.classList.toggle('is-expanded');
    button.textContent = expanded ? 'Ver menos' : 'Leer más';
    button.setAttribute('aria-expanded', String(expanded));
});

const letterButton = $('#letterButton');
const letterBody = $('#letterBody');
letterButton?.addEventListener('click', () => {
    const isOpen = letterBody.classList.toggle('is-open');
    letterButton.innerHTML = isOpen ? 'Cerrar carta <span aria-hidden="true">×</span>' : 'Abrir carta <span aria-hidden="true">♡</span>';
    letterButton.setAttribute('aria-expanded', String(isOpen));
});
const heartButton = $('#heartButton');
heartButton?.addEventListener('click', () => {
    const isLoved = heartButton.classList.toggle('loved');
    $('#heartText').textContent = isLoved ? 'yo también te elijo' : 'te quiero';
});

registerPageVisit(isAdminRoute ? 'admin' : 'inicio');
loadLetterContent();
loadStoryLetters();
if (!isAdminRoute) supabaseClient.channel('cartas-centro-publicas').on('postgres_changes', { event: '*', schema: 'public', table: 'cartas_centro' }, loadStoryLetters).subscribe();

if (isAdminRoute) {
    const adminLogin = $('#adminLogin');
    const adminEmail = $('#adminEmail');
    const adminPassword = $('#adminPassword');
    const loginStatus = $('#loginStatus');
    const memoryTools = $('#memoryTools');
    const storyLetterTitle = $('#storyLetterTitle');
    const storyLetterContent = $('#storyLetterContent');
    const storyLetterSave = $('#storyLetterSave');
    const storyLetterStatus = $('#storyLetterStatus');
    const letterSave = $('#letterSave');
    const letterStatus = $('#letterStatus');
    const memorySelect = $('#memorySelect');
    const newMemoryButton = $('#newMemoryButton');
    const memoryText = $('#memoryText');
    const memorySave = $('#memorySave');
    const memoryStatus = $('#memoryStatus');
    const photoInput = $('#photoInput');
    const photoLabel = $('#photoLabel');
    const photoPreview = $('#photoPreview');
    const visitsList = $('#visitsList');
    const deleteSelectedVisits = $('#deleteSelectedVisits');
    let selectedPhoto = null;
    let currentMemoryId = null;

    function resetMemoryForm() {
        currentMemoryId = null;
        memoryText.value = '';
        photoInput.value = '';
        photoLabel.textContent = 'Elegir una foto';
        photoPreview.innerHTML = '';
        selectedPhoto = null;
        memoryStatus.textContent = 'Preparado para un recuerdo nuevo.';
        memorySelect.value = '';
    }
    function showMemory(memory) {
        currentMemoryId = memory.id;
        memoryText.value = memory.texto || '';
        photoPreview.innerHTML = memory.foto_url ? `<img src="${escapeHtml(memory.foto_url)}" alt="Foto guardada del recuerdo">` : '';
        photoLabel.textContent = memory.foto_url ? 'Foto guardada (puedes reemplazarla)' : 'Elegir una foto';
        photoInput.value = '';
        selectedPhoto = null;
        memoryStatus.textContent = '';
    }
    async function loadSavedMemory() {
        const { data: memories, error } = await supabaseClient.from('recuerdos').select('id, texto, foto_url, creado_en').order('creado_en', { ascending: false });
        if (error) { memoryStatus.textContent = 'No se pudieron cargar los recuerdos.'; return; }
        memorySelect.innerHTML = `<option value="">Crear un recuerdo nuevo</option>${memories.map((memory) => `<option value="${escapeHtml(memory.id)}">${escapeHtml(formatDate(memory.creado_en))} · ${escapeHtml((memory.texto || 'Foto sin texto').slice(0, 38))}</option>`).join('')}`;
        resetMemoryForm();
    }
    function selectedVisitIds() { return [...visitsList.querySelectorAll('.visit-checkbox:checked')].map((checkbox) => checkbox.value); }
    function updateSelectedVisitsButton() {
        const count = selectedVisitIds().length;
        deleteSelectedVisits.disabled = count === 0;
        deleteSelectedVisits.textContent = count ? `Eliminar seleccionados (${count})` : 'Eliminar seleccionados';
    }
    async function loadVisits() {
        const { data: visits, error } = await supabaseClient.from('visitas').select('id, pagina, ip, visitado_en').order('visitado_en', { ascending: false }).limit(100);
        if (error) { visitsList.innerHTML = '<p class="memory-status">No se pudieron cargar las conexiones.</p>'; return; }
        if (!visits.length) { visitsList.innerHTML = '<p class="memory-status">Todavía no hay conexiones registradas.</p>'; return; }
        visitsList.innerHTML = visits.map((visit) => `<label class="visit-row"><input class="visit-checkbox" type="checkbox" value="${escapeHtml(visit.id)}" aria-label="Seleccionar conexión"><span class="visit-details"><strong>${escapeHtml(visit.pagina)}</strong><span>${escapeHtml(visit.ip || 'IP no disponible')}</span><time datetime="${escapeHtml(visit.visitado_en)}">${formatDateTime(visit.visitado_en)}</time></span><button class="visit-delete" type="button" data-visit-id="${escapeHtml(visit.id)}" aria-label="Eliminar esta conexión">×</button></label>`).join('');
        updateSelectedVisitsButton();
    }
    async function deleteVisits(ids) {
        const { error } = await supabaseClient.from('visitas').delete().in('id', ids);
        if (error) { memoryStatus.textContent = `No se pudieron eliminar las conexiones: ${error.message}`; return; }
        await loadVisits();
    }
    async function showAdminPanel() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;
        adminLogin.hidden = true;
        memoryTools.hidden = false;
        await Promise.all([loadSavedMemory(), loadVisits()]);
    }

    adminLogin.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginStatus.textContent = 'Comprobando acceso...';
        const { error } = await supabaseClient.auth.signInWithPassword({ email: adminEmail.value.trim(), password: adminPassword.value });
        if (error) { loginStatus.textContent = error.message === 'Invalid login credentials' ? 'El correo o la contraseña no coinciden.' : `No se pudo iniciar sesión: ${error.message}`; return; }
        loginStatus.textContent = '';
        await showAdminPanel();
    });
    $('#logoutButton').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        memoryTools.hidden = true;
        adminLogin.hidden = false;
        adminPassword.value = '';
        loginStatus.textContent = 'Sesión cerrada.';
    });
    storyLetterSave.addEventListener('click', async () => {
        const titulo = storyLetterTitle.value.trim();
        const contenido = storyLetterContent.value.trim();
        if (!titulo || !contenido) { storyLetterStatus.textContent = 'Escribe el título y el contenido de la carta.'; return; }
        storyLetterSave.disabled = true;
        storyLetterStatus.textContent = 'Guardando carta...';
        const { error } = await supabaseClient.from('cartas_centro').insert({ titulo, contenido });
        storyLetterSave.disabled = false;
        if (error) { storyLetterStatus.textContent = `No se pudo guardar la carta: ${error.message}`; return; }
        storyLetterTitle.value = '';
        storyLetterContent.value = '';
        storyLetterStatus.textContent = 'Carta guardada en Nuestro pedacito de mundo.';
    });
    letterSave.addEventListener('click', async () => {
        letterStatus.textContent = 'Guardando carta inferior...';
        const { error } = await supabaseClient.from('contenido_sitio').update({ saludo: $('#letterSalutationInput').value, parrafo_uno: $('#letterParagraphOneInput').value, parrafo_dos: $('#letterParagraphTwoInput').value, actualizado_en: new Date().toISOString() }).eq('id', true);
        letterStatus.textContent = error ? `No se pudo guardar la carta: ${error.message}` : 'Carta inferior actualizada.';
    });
    memorySelect.addEventListener('change', async () => {
        if (!memorySelect.value) { resetMemoryForm(); return; }
        const { data: memory, error } = await supabaseClient.from('recuerdos').select('id, texto, foto_url, creado_en').eq('id', memorySelect.value).single();
        if (error) memoryStatus.textContent = 'No se pudo abrir el recuerdo.';
        else showMemory(memory);
    });
    newMemoryButton.addEventListener('click', resetMemoryForm);
    photoInput.addEventListener('change', async () => {
        const [photo] = photoInput.files;
        if (!photo) return;
        photoLabel.textContent = photo.name;
        memoryStatus.textContent = 'Optimizando la foto...';
        try {
            selectedPhoto = { contenido: await compressPhoto(photo) };
            photoPreview.innerHTML = `<img src="${selectedPhoto.contenido}" alt="Vista previa del recuerdo">`;
            memoryStatus.textContent = 'Foto lista para guardar.';
        } catch (error) { selectedPhoto = null; memoryStatus.textContent = error.message; }
    });
    memorySave.addEventListener('click', async () => {
        const texto = memoryText.value.trim();
        if (!texto && !selectedPhoto && !currentMemoryId) { memoryStatus.textContent = 'Agrega un texto, una foto o ambos para guardar el recuerdo.'; return; }
        memorySave.disabled = true;
        memoryStatus.textContent = 'Guardando recuerdo...';
        let photoUrl = null;
        if (selectedPhoto) {
            const photoBlob = await fetch(selectedPhoto.contenido).then((response) => response.blob());
            const photoPath = `recuerdos/${crypto.randomUUID()}.webp`;
            const { error: uploadError } = await supabaseClient.storage.from('fotos').upload(photoPath, photoBlob, { contentType: 'image/webp', upsert: false });
            if (uploadError) { memorySave.disabled = false; memoryStatus.textContent = `No se pudo subir la foto: ${uploadError.message}`; return; }
            photoUrl = supabaseClient.storage.from('fotos').getPublicUrl(photoPath).data.publicUrl;
        }
        const memoryData = { texto, ...(photoUrl ? { foto_url: photoUrl } : {}) };
        const request = currentMemoryId ? supabaseClient.from('recuerdos').update(memoryData).eq('id', currentMemoryId) : supabaseClient.from('recuerdos').insert(memoryData);
        const { error } = await request;
        memorySave.disabled = false;
        if (error) { memoryStatus.textContent = `No se pudo guardar el recuerdo: ${error.message}`; return; }
        memoryStatus.textContent = 'Recuerdo guardado.';
        await loadSavedMemory();
    });
    visitsList.addEventListener('change', (event) => { if (event.target.matches('.visit-checkbox')) updateSelectedVisitsButton(); });
    visitsList.addEventListener('click', async (event) => {
        const button = event.target.closest('.visit-delete');
        if (!button || !window.confirm('¿Eliminar esta conexión del historial?')) return;
        await deleteVisits([button.dataset.visitId]);
    });
    deleteSelectedVisits.addEventListener('click', async () => {
        const ids = selectedVisitIds();
        if (!ids.length || !window.confirm(`¿Eliminar ${ids.length} conexiones del historial?`)) return;
        await deleteVisits(ids);
    });
    showAdminPanel();
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
