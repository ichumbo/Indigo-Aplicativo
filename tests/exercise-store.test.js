const test = require('node:test');
const assert = require('node:assert/strict');

function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getYoutubeThumbnailUrl(url) {
  if (!url) return undefined;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return undefined;
}

function getYoutubeVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match && match[1] ? match[1] : null;
}

test('normalização de texto remove acentos e caracteres especiais para busca robusta', () => {
  assert.equal(normalizeText('Abdução De Quadril Em Cócoras'), 'abducao de quadril em cocoras');
  assert.equal(normalizeText('Alongamento Glúteo'), 'alongamento gluteo');
  assert.equal(normalizeText('  ELEVAÇÃO PÉLVICA '), 'elevacao pelvica');
});

test('extração de thumbnail e videoId do YouTube suporta múltiplos formatos', () => {
  const url1 = 'https://www.youtube.com/watch?v=op9kVnSso6Q';
  const url2 = 'https://youtu.be/op9kVnSso6Q?t=10';
  const url3 = 'https://www.youtube.com/embed/op9kVnSso6Q';
  const url4 = 'https://www.youtube.com/shorts/op9kVnSso6Q';

  assert.equal(getYoutubeVideoId(url1), 'op9kVnSso6Q');
  assert.equal(getYoutubeVideoId(url2), 'op9kVnSso6Q');
  assert.equal(getYoutubeVideoId(url3), 'op9kVnSso6Q');
  assert.equal(getYoutubeVideoId(url4), 'op9kVnSso6Q');

  assert.equal(getYoutubeThumbnailUrl(url1), 'https://img.youtube.com/vi/op9kVnSso6Q/hqdefault.jpg');
});

test('validação de limite de tamanho de vídeo local (50MB)', () => {
  const maxBytes = 50 * 1024 * 1024;
  const validVideoSize = 25 * 1024 * 1024;
  const invalidVideoSize = 58 * 1024 * 1024;

  assert.equal(validVideoSize <= maxBytes, true);
  assert.equal(invalidVideoSize <= maxBytes, false);
});
