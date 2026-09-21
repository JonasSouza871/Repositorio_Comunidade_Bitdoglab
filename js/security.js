/**
 * Security and URL helpers shared by UI renderers.
 */

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function sanitizeHttpUrl(value) {
    if (!value) return '';

    try {
        const url = new URL(String(value), window.location.origin);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
        return url.href;
    } catch (error) {
        return '';
    }
}

function sanitizeHttpsUrl(value) {
    const url = sanitizeHttpUrl(value);
    return url.startsWith('https://') ? url : '';
}

function sanitizeGithubRepoUrl(value) {
    const url = sanitizeHttpsUrl(value);
    if (!url) return '';

    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (!/(^|\.)github\.com$/i.test(parsed.hostname)) return '';
        return parts.length >= 2 ? parsed.href : '';
    } catch (error) {
        return '';
    }
}

function sanitizeSocialProfileUrl(value, service) {
    const url = sanitizeHttpsUrl(value);
    if (!url) return '';

    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);

        if (service === 'linkedin') {
            return /(^|\.)linkedin\.com$/i.test(parsed.hostname) && parts[0] === 'in' && parts.length >= 2
                ? parsed.href
                : '';
        }

        if (service === 'github') {
            return /(^|\.)github\.com$/i.test(parsed.hostname) && parts.length >= 1
                ? parsed.href
                : '';
        }

        return '';
    } catch (error) {
        return '';
    }
}

function getDirectImageUrl(value) {
    const url = sanitizeHttpsUrl(value);
    if (!url) return '';

    try {
        const parsed = new URL(url);
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

        if (driveMatch && /(^|\.)google\.com$/i.test(parsed.hostname)) {
            return `https://lh3.googleusercontent.com/d/${driveMatch[1]}=s800`;
        }

        if (/(^|\.)dropbox\.com$/i.test(parsed.hostname)) {
            parsed.hostname = 'dl.dropboxusercontent.com';
            parsed.searchParams.delete('dl');
            return parsed.href;
        }

        return parsed.href;
    } catch (error) {
        return '';
    }
}

// Mantem o fallback visual sem depender de handlers inline, que sao
// bloqueados pela politica CSP do site.
document.addEventListener('error', function(event) {
    if (event.target instanceof HTMLImageElement) {
        event.target.style.display = 'none';
    }
}, true);
