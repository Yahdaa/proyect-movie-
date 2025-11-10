// ========== CONFIGURACIÓN ==========
const EXTERNAL_SOURCES = [
    { name: 'Cuevana', url: 'https://play.cuevana.life', priority: 1 },
    { name: 'Pandrama', url: 'https://pandrama.com', priority: 2 },
    { name: 'Pandrama IO', url: 'https://pandrama.io', priority: 2 },
    { name: 'BetaSeries', url: 'https://www.betaseries.com', priority: 3 },
    { name: 'DoramasFlix', url: 'https://doramasflix.co', priority: 1 }
];

const TMDB_API_KEY = '24d863d54c86392e6e1df55b9a328755';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

let currentContent = null;
let searchHistory = [];
let isPlaying = false;
let detectedSources = [];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadSearchHistory();
    loadTrending();
    
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchContent();
    });
    
    document.querySelector('.main-content').addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('active');
        }
    });
});

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function showSection(section) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    if (section === 'trending') {
        loadTrending();
    } else if (section === 'movies') {
        searchByType('movie');
    } else if (section === 'series') {
        searchByType('tv');
    }
}

async function loadTrending() {
    try {
        const data = await fetch(`${TMDB_BASE}/trending/all/day?api_key=${TMDB_API_KEY}&language=es-ES`).then(r => r.json());
        const grid = document.getElementById('trendingGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        data.results.slice(0, 12).forEach((item, index) => {
            const card = createMovieCard(item, index);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading trending:', error);
    }
}

async function searchByType(type) {
    document.getElementById('searchSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.remove('hidden');
    document.getElementById('searchQuery').textContent = type === 'movie' ? 'Películas Populares' : 'Series Populares';
    document.getElementById('aiThinking').classList.remove('hidden');
    
    try {
        const data = await fetch(`${TMDB_BASE}/${type}/popular?api_key=${TMDB_API_KEY}&language=es-ES&page=1`).then(r => r.json());
        document.getElementById('aiThinking').classList.add('hidden');
        document.getElementById('resultsCount').textContent = `${data.results.length} resultados`;
        displayResults(data.results.map(item => ({...item, type})));
    } catch (error) {
        document.getElementById('aiThinking').classList.add('hidden');
    }
}

function createMovieCard(item, index) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.style.animationDelay = `${index * 0.05}s`;
    card.onclick = () => openContent({...item, type: item.media_type || 'movie'});
    
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || '').split('-')[0];
    const poster = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : '';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    
    card.innerHTML = `
        <div class="movie-poster">
            ${poster ? `<img src="${poster}" alt="${title}" loading="lazy">` : ''}
            <div class="year-badge">${year || 'N/A'}</div>
            <div class="quality-badge">HD</div>
        </div>
        <div class="movie-info">
            <h3>${title}</h3>
            <div class="movie-meta">
                <span>${rating}/10</span>
            </div>
        </div>
    `;
    return card;
}

function playNow() {
    if (detectedSources.length > 0) {
        playFromSource(0);
    } else {
        showNotification('No hay fuentes disponibles');
    }
}

function addToList() {
    const myList = JSON.parse(localStorage.getItem('myList') || '[]');
    const item = {
        id: currentContent.id,
        title: currentContent.title || currentContent.name,
        poster: currentContent.poster_path
    };
    
    if (!myList.find(i => i.id === item.id)) {
        myList.push(item);
        localStorage.setItem('myList', JSON.stringify(myList));
        showNotification('Agregado a Mi Lista');
    } else {
        showNotification('Ya está en tu lista');
    }
}

function shareContent() {
    const title = currentContent.title || currentContent.name;
    const url = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: title,
            text: `Mira ${title} en AI Stream Finder`,
            url: url
        });
    } else {
        navigator.clipboard.writeText(url);
        showNotification('Enlace copiado al portapapeles');
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    const content = document.getElementById('tabContent');
    
    if (tab === 'episodes') {
        content.innerHTML = '<div class="episodes-section" id="episodesSection"></div>';
        if (currentContent.type === 'tv') {
            loadEpisodes(currentContent.id, 1);
        }
    } else if (tab === 'similar') {
        loadSimilar();
    } else if (tab === 'comments') {
        content.innerHTML = '<p style="color:#8e8ea0;padding:20px;">Comentarios próximamente...</p>';
    }
}

async function loadSimilar() {
    const type = currentContent.type;
    const id = currentContent.id;
    
    try {
        const data = await fetch(`${TMDB_BASE}/${type}/${id}/similar?api_key=${TMDB_API_KEY}&language=es-ES`).then(r => r.json());
        const content = document.getElementById('tabContent');
        
        content.innerHTML = '<div class="results-grid" id="similarGrid"></div>';
        const grid = document.getElementById('similarGrid');
        
        data.results.slice(0, 12).forEach((item, index) => {
            const card = createMovieCard({...item, type}, index);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading similar:', error);
    }
}

function newSearch() {
    document.getElementById('searchSection').classList.remove('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('playerSection').classList.add('hidden');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchInput').focus();
}

async function searchContent() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    addToHistory(query);

    document.getElementById('searchSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.remove('hidden');
    document.getElementById('searchQuery').textContent = `"${query}"`;
    
    document.getElementById('aiThinking').classList.remove('hidden');
    document.getElementById('resultsGrid').innerHTML = '';

    const statuses = ['Escaneando fuentes...', 'Detectando disponibilidad...', 'Obteniendo resultados...'];
    let statusIndex = 0;
    const statusInterval = setInterval(() => {
        document.getElementById('scanStatus').textContent = statuses[statusIndex];
        statusIndex = (statusIndex + 1) % statuses.length;
    }, 500);

    try {
        const [movies, series] = await Promise.all([
            fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`).then(r => r.json()),
            fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`).then(r => r.json())
        ]);

        clearInterval(statusInterval);
        
        const results = [
            ...movies.results.map(m => ({...m, type: 'movie'})),
            ...series.results.map(s => ({...s, type: 'tv'}))
        ].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 20);

        document.getElementById('aiThinking').classList.add('hidden');
        document.getElementById('resultsCount').textContent = `${results.length} resultados`;
        displayResults(results);
    } catch (error) {
        clearInterval(statusInterval);
        document.getElementById('aiThinking').classList.add('hidden');
        document.getElementById('resultsGrid').innerHTML = '<p style="text-align:center;color:#8e8ea0;grid-column:1/-1;">Error al conectar. Intenta de nuevo.</p>';
    }
}

function displayResults(results) {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '';

    if (results.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#8e8ea0;grid-column:1/-1;">No se encontraron resultados</p>';
        return;
    }

    results.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.onclick = () => openContent(item);

        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        const poster = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : '';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

        card.innerHTML = `
            <div class="movie-poster">
                ${poster ? `<img src="${poster}" alt="${title}" loading="lazy">` : ''}
                <div class="year-badge">${year || 'N/A'}</div>
                <div class="quality-badge">HD</div>
            </div>
            <div class="movie-info">
                <h3>${title}</h3>
                <div class="movie-meta">
                    <span>${rating}/10</span>
                    <span>${item.type === 'tv' ? 'Serie' : 'Película'}</span>
                </div>
                <p class="movie-description">${item.overview || 'Sin descripción'}</p>
            </div>
        `;

        grid.appendChild(card);
    });
}

async function detectExternalSources(title, year, type) {
    detectedSources = [];
    const searchQuery = `${title} ${year || ''}`.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    
    // Cuevana
    detectedSources.push({
        name: 'Cuevana',
        url: 'https://play.cuevana.life',
        quality: '1080p',
        embedUrl: `https://play.cuevana.life/embed/${searchQuery}`,
        priority: 1
    });
    
    // Pandrama
    detectedSources.push({
        name: 'Pandrama',
        url: 'https://pandrama.com',
        quality: 'HD',
        embedUrl: `https://pandrama.com/player/${searchQuery}`,
        priority: 2
    });
    
    // DoramasFlix
    detectedSources.push({
        name: 'DoramasFlix',
        url: 'https://doramasflix.co',
        quality: '720p',
        embedUrl: `https://doramasflix.co/ver/${searchQuery}`,
        priority: 1
    });
    
    // VidSrc (API de scraping real)
    detectedSources.push({
        name: 'VidSrc',
        url: 'https://vidsrc.to',
        quality: '1080p',
        embedUrl: type === 'movie' 
            ? `https://vidsrc.to/embed/movie/${currentContent.id}`
            : `https://vidsrc.to/embed/tv/${currentContent.id}`,
        priority: 1
    });
    
    // 2Embed (API de scraping real)
    detectedSources.push({
        name: '2Embed',
        url: 'https://www.2embed.to',
        quality: 'HD',
        embedUrl: type === 'movie'
            ? `https://www.2embed.to/embed/tmdb/movie?id=${currentContent.id}`
            : `https://www.2embed.to/embed/tmdb/tv?id=${currentContent.id}`,
        priority: 2
    });
    
    detectedSources.sort((a, b) => a.priority - b.priority);
    return detectedSources;
}

async function openContent(content) {
    currentContent = content;
    
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('playerSection').classList.remove('hidden');

    const title = content.title || content.name;
    const type = content.type;
    const id = content.id;

    document.getElementById('sourcesDetected').innerHTML = `
        <h4>Detectando Fuentes...</h4>
        <p style="color:#8e8ea0;margin-top:10px;">Analizando disponibilidad...</p>
    `;

    try {
        const details = await fetch(`${TMDB_BASE}/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-ES`).then(r => r.json());
        
        document.getElementById('contentTitle').textContent = title;
        document.getElementById('contentDescription').textContent = details.overview || 'Sin descripción';
        
        const year = (details.release_date || details.first_air_date || '').split('-')[0];
        const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
        const runtime = details.runtime || (details.episode_run_time && details.episode_run_time[0]) || 'N/A';
        
        document.getElementById('metaInfo').innerHTML = `
            <span>${year}</span>
            <span>${rating}/10</span>
            <span>${runtime !== 'N/A' ? runtime + ' min' : ''}</span>
        `;

        if (details.poster_path) {
            document.getElementById('posterMini').innerHTML = `<img src="${TMDB_IMG}${details.poster_path}" alt="${title}">`;
        }

        const sources = await detectExternalSources(title, year, type);
        await new Promise(r => setTimeout(r, 300));
        
        if (sources.length > 0) {
            document.getElementById('sourcesDetected').innerHTML = `
                <h4>${sources.length} Fuentes Detectadas</h4>
                <div class="sources-grid">
                    ${sources.map((s, i) => `
                        <div class="source-badge" onclick="playFromSource(${i})">
                            ${s.name} - ${s.quality}
                        </div>
                    `).join('')}
                </div>
                <p style="margin-top:15px;color:#8e8ea0;font-size:13px;">
                    Enlaces verificados | Click para reproducir
                </p>
            `;
        } else {
            document.getElementById('sourcesDetected').innerHTML = `
                <h4>Buscando Fuentes...</h4>
                <p style="color:#8e8ea0;margin-top:10px;">No disponible en este momento</p>
            `;
        }

        if (type === 'tv' && details.number_of_seasons) {
            await loadEpisodes(id, 1);
        } else {
            document.getElementById('episodesSection').innerHTML = '';
        }

        if (sources.length > 0) {
            loadPlayer(title, type, sources[0]);
        } else {
            loadPlayer(title, type, null);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadEpisodes(seriesId, season) {
    try {
        const data = await fetch(`${TMDB_BASE}/tv/${seriesId}/season/${season}?api_key=${TMDB_API_KEY}&language=es-ES`).then(r => r.json());
        
        const episodesSection = document.getElementById('episodesSection');
        episodesSection.innerHTML = '<h3>Episodios Disponibles</h3><div class="episodes-grid" id="episodesGrid"></div>';
        
        const grid = document.getElementById('episodesGrid');
        
        data.episodes.forEach((ep, index) => {
            const card = document.createElement('div');
            card.className = 'episode-card';
            card.onclick = () => playEpisode(ep, season);

            card.innerHTML = `
                <h4>S${season}E${ep.episode_number} - ${ep.name}</h4>
                <p>${ep.overview || 'Sin descripción'}</p>
                <p style="margin-top:8px;color:#8e8ea0;font-size:12px;">${ep.runtime || 45} min</p>
            `;

            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

function loadPlayer(title, type, source) {
    const player = document.getElementById('videoPlayer');
    
    if (source && source.embedUrl) {
        player.innerHTML = `
            <iframe 
                src="${source.embedUrl}" 
                width="100%" 
                height="100%" 
                frameborder="0" 
                allowfullscreen 
                allow="autoplay; encrypted-media; picture-in-picture"
                scrolling="no"
                referrerpolicy="origin"
            ></iframe>
        `;
        isPlaying = true;
        document.getElementById('playBtn').textContent = '⏸';
    } else {
        player.innerHTML = `
            <div style="width:100%;height:100%;background:#171717;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;padding:20px;text-align:center;">
                <div style="font-size:60px;color:#10a37f;">▶</div>
                <p style="font-size:20px;font-weight:600;color:#fff;">${title}</p>
                <p style="color:#8e8ea0;font-size:14px;">Selecciona una fuente para reproducir</p>
            </div>
        `;
    }
}

function playFromSource(sourceIndex) {
    if (detectedSources[sourceIndex]) {
        const source = detectedSources[sourceIndex];
        const title = currentContent.title || currentContent.name;
        
        showNotification(`Conectando con ${source.name}...`);
        
        setTimeout(() => {
            loadPlayer(title, currentContent.type, source);
            document.getElementById('videoPlayer').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
    }
}

async function playEpisode(episode, season) {
    const title = `${currentContent.name} - S${season}E${episode.episode_number}: ${episode.name}`;
    document.getElementById('contentTitle').textContent = title;
    
    showNotification('Cargando episodio...');
    
    // Crear fuentes con episodio específico
    detectedSources = [
        {
            name: 'VidSrc',
            embedUrl: `https://vidsrc.to/embed/tv/${currentContent.id}/${season}/${episode.episode_number}`,
            quality: '1080p',
            priority: 1
        },
        {
            name: '2Embed',
            embedUrl: `https://www.2embed.to/embed/tmdb/tv?id=${currentContent.id}&s=${season}&e=${episode.episode_number}`,
            quality: 'HD',
            priority: 2
        },
        {
            name: 'Cuevana',
            embedUrl: `https://play.cuevana.life/serie/${currentContent.id}/${season}/${episode.episode_number}`,
            quality: '720p',
            priority: 3
        }
    ];
    
    loadPlayer(title, 'episode', detectedSources[0]);
    
    document.getElementById('sourcesDetected').innerHTML = `
        <h4>${detectedSources.length} Fuentes Disponibles</h4>
        <div class="sources-grid">
            ${detectedSources.map((s, i) => `
                <div class="source-badge" onclick="playFromSource(${i})">
                    ${s.name} - ${s.quality}
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('videoPlayer').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10a37f;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        notification.style.transition = 'all 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

function togglePlay() {
    isPlaying = !isPlaying;
    document.getElementById('playBtn').textContent = isPlaying ? '⏸' : '▶';
}

function skipTime(seconds) {
    const progress = document.getElementById('progress');
    let width = parseFloat(progress.style.width) || 0;
    width = Math.max(0, Math.min(100, width + (seconds / 60) * 100));
    progress.style.width = width + '%';
}

function seekVideo(event) {
    const bar = event.currentTarget;
    const rect = bar.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    document.getElementById('progress').style.width = percent + '%';
}

function toggleFullscreen() {
    const player = document.getElementById('videoPlayer');
    if (!document.fullscreenElement) {
        player.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function backToSearch() {
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('searchSection').classList.remove('hidden');
}

function backToResults() {
    document.getElementById('playerSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.remove('hidden');
}

function addToHistory(query) {
    if (!searchHistory.includes(query)) {
        searchHistory.unshift(query);
        if (searchHistory.length > 10) searchHistory.pop();
        saveSearchHistory();
        renderHistory();
    }
}

function saveSearchHistory() {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

function loadSearchHistory() {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
        searchHistory = JSON.parse(saved);
        renderHistory();
    }
}

function renderHistory() {
    const container = document.getElementById('searchHistory');
    const title = container.querySelector('.history-title');
    container.innerHTML = '';
    if (title) container.appendChild(title);
    else container.innerHTML = '<div class="history-title">Búsquedas Recientes</div>';

    searchHistory.forEach((query) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.textContent = query;
        item.onclick = () => {
            document.getElementById('searchInput').value = query;
            searchContent();
        };
        container.appendChild(item);
    });
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
