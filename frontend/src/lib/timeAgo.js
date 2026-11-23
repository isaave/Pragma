export default function timeAgo(value) {
    const created = new Date(value).getTime();
    const minutes = Math.floor((Date.now() - created) / 60000);
    if (!Number.isFinite(minutes) || minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours} h`;
    return `Há ${Math.floor(hours / 24)} d`;
}
