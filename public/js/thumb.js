const PLAYABLE_TYPES = new Set([
  'video/webm',
  'audio/mpeg',
  'video/mp4',
  'video/ogg',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/wav',
  'audio/flac'
]);
const VIDEO_TYPES = new Set(['video/webm', 'video/mp4', 'video/ogg']);
const YT_RE = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
const NICO_RE = /(?:nicovideo\.jp\/watch\/|nico\.ms\/)((?:sm|nm|so|lv)\d+)/i;
const TWEET_RE = /(?:twitter|x|fxtwitter|fixupx|twittpr|fixvx)\.com\/(?:i\/(?:web\/)?|[\w.]+\/)?status(?:es)?\/(\d+)/i;
const BSKY_RE = /(?:bsky\.app|fxbsky\.app|bsky\.social)\/profile\/([\w.:%-]+)\/post\/([a-z0-9]+)/i;
const IG_RE =
  /https?:\/\/(?:www\.|m\.)?(?:instagram\.com|instagr\.am|uuinstagram\.com|ddinstagram\.com|kkinstagram\.com|eeinstagram\.com|vxinstagram\.com|fxstagram\.com)\/(?:share\/|(?!share\/|p\/|reel\/|reels\/|tv\/)([A-Za-z0-9._]{1,40})\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,64})/i;
const TIKTOK_DIRECT_RE =
  /https?:\/\/(?:www\.|m\.)?tiktok\.com\/(?:@([A-Za-z0-9._-]+)\/(video|photo)\/(\d{8,25})|v\/(\d{8,25})|embed(?:\/v2)?\/(\d{8,25})|player\/v1\/(\d{8,25}))/i;
const TIKTOK_SHORT_RE =
  /https?:\/\/(?:(vm|vt)\.tiktok\.com\/([A-Za-z0-9_-]{4,32})|(?:www\.)?tiktok\.com\/t\/([A-Za-z0-9_-]{4,32}))/i;
const BILI_BV_RE = /bilibili\.com\/video\/(BV[0-9A-Za-z]{10})/i;
const BILI_AV_RE = /bilibili\.com\/video\/[aA][vV](\d+)/;
const BILI_PAGE_RE = /[?&]p=(\d+)/i;
const BILI_PLAYER_RE = /^https:\/\/player\.bilibili\.com\/player\.html\?/i;
const CYTUBE_RE = /cytu\.be\/r\/([\w-]{1,30})/i;
const TWITCH_CHANNEL_RE = /(?:^|\/\/)(?:www\.|m\.)?twitch\.tv\/([A-Za-z0-9_]+)\/?(?:[?#]|$)/i;
const TWITCH_VOD_RE = /(?:^|\/\/)(?:www\.|m\.)?twitch\.tv\/videos\/(\d+)/i;
const TWITCH_CLIP_RE = /(?:^|\/\/)(?:www\.|m\.)?clips\.twitch\.tv\/([A-Za-z0-9_-]+)/i;
const TWITCH_CHANNEL_CLIP_RE = /(?:^|\/\/)(?:www\.|m\.)?twitch\.tv\/[A-Za-z0-9_]+\/clip\/([A-Za-z0-9_-]+)/i;
const VOCAROO_RE =
  /(?:^|\/\/)(?:[a-z0-9-]+\.)?(?:vocaroo\.com|voca\.ro)\/(?:e(?:mbed)?\/|i\/|mp3\/)?([A-Za-z0-9_-]{8,32})(?:[/?#]|$)/i;
const VOCAROO_MP3_BASE = 'https://media.vocaroo.com/mp3/';
const VOCAROO_EMBED_BASE = 'https://vocaroo.com/embed/';

function vocarooIdFrom(href) {
  const match = String(href || '').match(VOCAROO_RE);
  return match ? match[1] : null;
}

function vocarooFrame(id) {
  const frame = document.createElement('iframe');
  frame.src = VOCAROO_EMBED_BASE + id + '?autoplay=0';
  frame.loading = 'lazy';
  frame.width = '640';
  frame.height = '150';
  frame.style.maxWidth = '100%';
  frame.style.marginTop = '3px';
  frame.setAttribute('frameborder', '0');
  frame.setAttribute('allow', 'autoplay; encrypted-media');
  frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  return frame;
}

function vocarooAudio(id) {
  const media = document.createElement('audio');
  media.controls = true;
  media.preload = 'metadata';
  media.style.maxWidth = '100%';
  media.style.marginTop = '3px';
  const source = document.createElement('source');
  source.src = VOCAROO_MP3_BASE + id;
  source.type = 'audio/mpeg';
  media.appendChild(source);
  const fallback = () => {
    if (media.isConnected) media.replaceWith(vocarooFrame(id));
  };
  media.addEventListener('error', fallback, { once: true });
  source.addEventListener('error', fallback, { once: true });
  return media;
}

function embedUrlFor(href) {
  const url = String(href || '');
  const youtube = url.match(YT_RE);
  if (youtube) return 'https://www.youtube.com/embed/' + youtube[1];
  const nicovideo = url.match(NICO_RE);
  if (nicovideo) return 'https://embed.nicovideo.jp/watch/' + nicovideo[1].toLowerCase();

  const bilibili = url.match(BILI_BV_RE) || url.match(BILI_AV_RE);
  if (bilibili) {
    const page = (url.match(BILI_PAGE_RE) || [])[1] || '1';
    const id = bilibili[1].startsWith('BV') ? 'bvid=' + bilibili[1] : 'aid=' + bilibili[1];
    return 'https://player.bilibili.com/player.html?' + id + '&page=' + page + '&high_quality=1';
  }

  const tiktok = url.match(TIKTOK_DIRECT_RE);
  if (tiktok) {
    const ttId = tiktok[3] || tiktok[4] || tiktok[5] || tiktok[6];
    if (ttId) return 'https://www.tiktok.com/player/v1/' + ttId + '?controls=1&description=0&music_info=0&rel=0';
  }

  return twitchPlayerUrlFor(url);
}

const TWITCH_LOOPBACK_RE = /^(?:localhost|127\.0\.0\.1|\[::1\]|.*\.localhost)$/i;
const TWITCH_FRAME_RE = /^https:\/\/(?:player\.twitch\.tv\/\?|clips\.twitch\.tv\/embed\?)/i;

function twitchFrameRefusalReason() {
  const { protocol, hostname, port } = window.location;
  if (TWITCH_LOOPBACK_RE.test(hostname)) return null;
  if (/^[\d.]+$/.test(hostname) || hostname.startsWith('[')) return 'Twitch does not accept an IP address as an embedding site';
  if (protocol !== 'https:') return 'Twitch only embeds its player on an https page';
  if (port && port !== '443') return `Twitch only embeds its player on the standard https port, and this site is on :${port}`;
  return null;
}

function twitchCanBeFramed() {
  return twitchFrameRefusalReason() === null;
}

function twitchWatchUrlFor(playerUrl) {
  try {
    const url = new URL(playerUrl);
    const channel = url.searchParams.get('channel');
    if (channel) return 'https://www.twitch.tv/' + channel;
    const video = url.searchParams.get('video');
    if (video) return 'https://www.twitch.tv/videos/' + video;
    const clip = url.searchParams.get('clip');
    if (clip) return 'https://clips.twitch.tv/' + clip;
  } catch {
  }
  return null;
}

function twitchEmbedNote(watchUrl, reason) {
  const note = document.createElement('span');
  note.className = 'twitch-embed-note';
  note.textContent = `${reason || 'Twitch will not play in a frame on this page'} - `;
  const link = document.createElement('a');
  link.href = watchUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'watch on twitch.tv';
  note.appendChild(link);
  return note;
}

function fixTwitchFrames(root) {
  const hostname = window.location.hostname;
  const canFrame = twitchCanBeFramed();

  for (const iframe of (root || document).querySelectorAll('iframe[data-src], iframe[src]')) {
    const attr = iframe.hasAttribute('data-src') ? 'data-src' : 'src';
    const src = iframe.getAttribute(attr) || '';
    if (!TWITCH_FRAME_RE.test(src)) continue;

    if (!canFrame) {
      const watchUrl = twitchWatchUrlFor(src);
      if (watchUrl) iframe.replaceWith(twitchEmbedNote(watchUrl, twitchFrameRefusalReason()));
      else iframe.remove();
      continue;
    }

    if (!hostname) continue;
    try {
      const url = new URL(src);
      url.searchParams.set('parent', hostname);
      url.searchParams.set('autoplay', 'false');
      const wanted = url.toString();
      if (src !== wanted) iframe.setAttribute(attr, wanted);
    } catch {
    }
  }
}

function loadDeferredEmbeds(root) {
  for (const iframe of (root || document).querySelectorAll('iframe[data-src], details.embed-container iframe[src], details iframe[src]')) {
    const details = iframe.closest('details');
    const parked = iframe.getAttribute('data-src');
    const currentSrc = iframe.getAttribute('src') || '';
    const inEmbedContainer = Boolean(details?.classList?.contains('embed-container'));
    if (!parked && !inEmbedContainer && !BILI_PLAYER_RE.test(currentSrc)) continue;

    if (!iframe.getAttribute('loading')) iframe.setAttribute('loading', 'lazy');

    const load = () => {
      const src = iframe.getAttribute('data-src');
      if (!src) return;
      iframe.removeAttribute('data-src');
      iframe.setAttribute('src', src);
    };
    const unload = () => {
      const src = iframe.getAttribute('src');
      if (!src) return;
      iframe.setAttribute('data-src', src);
      iframe.removeAttribute('src');
    };

    if (!details) {
      load();
      continue;
    }

    const apply = () => (details.open ? load() : unload());
    if (iframe.dataset.embedToggle !== 'true') {
      iframe.dataset.embedToggle = 'true';
      details.addEventListener('toggle', apply);
    }
    apply();
  }
}

function twitchPlayerUrlFor(url) {
  const parent = encodeURIComponent(window.location.hostname);
  const tail = `&parent=${parent}&autoplay=false`;

  const vod = url.match(TWITCH_VOD_RE);
  if (vod) return 'https://player.twitch.tv/?video=' + vod[1] + tail;

  const clip = url.match(TWITCH_CLIP_RE) || url.match(TWITCH_CHANNEL_CLIP_RE);
  if (clip && clip[1].toLowerCase() !== 'embed') {
    return 'https://clips.twitch.tv/embed?clip=' + clip[1] + tail;
  }

  const channel = url.match(TWITCH_CHANNEL_RE);
  if (channel) return 'https://player.twitch.tv/?channel=' + channel[1].toLowerCase() + tail;
  return null;
}

const postVideos = new Map();

function isSafeMediaUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

function extractFxMediaItems(media) {
  if (!media || typeof media !== 'object') return [];
  const items = [];
  if (Array.isArray(media.all) && media.all.length) {
    for (const item of media.all) {
      if (!item || !isSafeMediaUrl(item.url)) continue;
      if (item.type === 'video' || item.type === 'gif') {
        items.push({
          kind: 'video',
          url: item.url,
          thumb: isSafeMediaUrl(item.thumbnail_url) ? item.thumbnail_url : null,
          loop: item.type === 'gif'
        });
      } else if (item.type === 'photo' || item.type === 'image') {
        items.push({
          kind: 'image',
          url: item.url,
          alt: String(item.altText || item.alt || '')
        });
      }
    }
  }
  if (!items.length) {
    for (const v of Array.isArray(media.videos) ? media.videos : []) {
      if (!v || !isSafeMediaUrl(v.url)) continue;
      items.push({
        kind: 'video',
        url: v.url,
        thumb: isSafeMediaUrl(v.thumbnail_url) ? v.thumbnail_url : null,
        loop: v.type === 'gif'
      });
    }
    for (const p of Array.isArray(media.photos) ? media.photos : []) {
      if (!p || !isSafeMediaUrl(p.url)) continue;
      items.push({
        kind: 'image',
        url: p.url,
        alt: String(p.altText || p.alt || '')
      });
    }
  }
  return items;
}

function extractFxQuote(rawQuote, provider) {
  if (!rawQuote || typeof rawQuote !== 'object') return null;
  const author = rawQuote.author || {};
  const handle = String(author.screen_name || author.handle || '');
  const text = String(rawQuote.text || '').trim();
  const items = extractFxMediaItems(rawQuote.media);
  if (!text && !items.length) return null;
  return {
    author: {
      name: String(author.name || (handle ? `@${handle}` : '')),
      handle,
      avatar: isSafeMediaUrl(author.avatar_url || author.avatar) ? author.avatar_url || author.avatar : null,
      url: isSafeMediaUrl(author.url)
        ? author.url
        : handle
          ? provider === 'bluesky'
            ? `https://bsky.app/profile/${encodeURIComponent(handle)}`
            : `https://x.com/${encodeURIComponent(handle)}`
          : null
    },
    text,
    items,
    postUrl: isSafeMediaUrl(rawQuote.url) ? rawQuote.url : null
  };
}

function extractPostData(data, provider) {
  const post = data && (data.tweet || data.status);
  if (!post) return null;
  const items = extractFxMediaItems(post.media);
  const quote = extractFxQuote(post.quote, provider);
  const authorObj = post.author || {};
  const handle = String(authorObj.screen_name || authorObj.handle || '');
  const avatar = isSafeMediaUrl(authorObj.avatar_url || authorObj.avatar) ? authorObj.avatar_url || authorObj.avatar : null;
  const authorUrl = isSafeMediaUrl(authorObj.url)
    ? authorObj.url
    : handle
      ? provider === 'bluesky'
        ? `https://bsky.app/profile/${encodeURIComponent(handle)}`
        : `https://x.com/${encodeURIComponent(handle)}`
      : null;
  const text = String(post.text || '').trim();
  const createdAt =
    post.created_at ||
    (Number.isFinite(Number(post.created_timestamp)) ? new Date(Number(post.created_timestamp) * 1000).toISOString() : null);
  const stats = {
    replies: Number.isFinite(Number(post.replies)) ? Number(post.replies) : null,
    reposts: Number.isFinite(Number(post.retweets ?? post.reposts)) ? Number(post.retweets ?? post.reposts) : null,
    likes: Number.isFinite(Number(post.likes)) ? Number(post.likes) : null
  };
  const postUrl = isSafeMediaUrl(post.url) ? post.url : null;
  return {
    provider,
    postUrl,
    author: {
      name: String(authorObj.name || (handle ? `@${handle}` : '')),
      handle,
      avatar,
      url: authorUrl
    },
    text,
    createdAt,
    items,
    quote,
    stats,
    iframeUrl: null
  };
}

function extractBlueskyAppViewMedia(embed) {
  if (!embed) return [];
  let target = embed.$type === 'app.bsky.embed.recordWithMedia#view' ? embed.media : embed;
  if (!Array.isArray(target?.images) || !target.images.length) {
    target = embed.record?.record?.embeds?.[0] || embed.record?.embeds?.[0] || target;
  }
  if (!Array.isArray(target?.images)) return [];
  return target.images
    .map((img) => ({
      kind: 'image',
      url: img && (img.fullsize || img.thumb),
      alt: String((img && img.alt) || '')
    }))
    .filter((item) => isSafeMediaUrl(item.url));
}

function extractBlueskyAppViewPost(data) {
  const post = data?.thread?.post;
  if (!post) return null;
  const embed = post.embed;
  const items = extractBlueskyAppViewMedia(embed);
  const text = String(post.record?.text || '').trim();
  const author = post.author || {};
  const handle = String(author.handle || '');
  let quote = null;
  const quotedRecord = embed?.record?.record || embed?.record;
  if (quotedRecord && (quotedRecord.value?.text || quotedRecord.author)) {
    const qHandle = String(quotedRecord.author?.handle || '');
    const qText = String(quotedRecord.value?.text || '').trim();
    const qItems = extractBlueskyAppViewMedia(quotedRecord.embeds?.[0]);
    if (qText || qItems.length) {
      quote = {
        author: {
          name: String(quotedRecord.author?.displayName || (qHandle ? `@${qHandle}` : '')),
          handle: qHandle,
          avatar: isSafeMediaUrl(quotedRecord.author?.avatar) ? quotedRecord.author.avatar : null,
          url: qHandle ? `https://bsky.app/profile/${encodeURIComponent(qHandle)}` : null
        },
        text: qText,
        items: qItems,
        postUrl: null
      };
    }
  }
  if (!text && !items.length && !quote) return null;
  return {
    provider: 'bluesky',
    postUrl: handle && post.uri ? `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${post.uri.split('/').pop()}` : null,
    author: {
      name: String(author.displayName || (handle ? `@${handle}` : '')),
      handle,
      avatar: isSafeMediaUrl(author.avatar) ? author.avatar : null,
      url: handle ? `https://bsky.app/profile/${encodeURIComponent(handle)}` : null
    },
    text,
    createdAt: post.record?.createdAt || null,
    items,
    quote,
    stats: {
      replies: Number.isFinite(Number(post.replyCount)) ? Number(post.replyCount) : null,
      reposts: Number.isFinite(Number(post.repostCount)) ? Number(post.repostCount) : null,
      likes: Number.isFinite(Number(post.likeCount)) ? Number(post.likeCount) : null
    },
    iframeUrl: null
  };
}

function hasEmbedContent(post) {
  if (!post) return false;
  if (post.text) return true;
  if (Array.isArray(post.items) && post.items.length) return true;
  if (isSafeMediaUrl(post.iframeUrl)) return true;
  if (post.quote && (post.quote.text || (Array.isArray(post.quote.items) && post.quote.items.length))) return true;
  return false;
}

function normalizeResolvedPost(post) {
  if (!hasEmbedContent(post)) return null;
  const items = Array.isArray(post.items) ? post.items : [];
  const firstVideo = items.find((item) => item.kind === 'video') || null;
  return {
    ...post,
    items,
    url: firstVideo ? firstVideo.url : null,
    thumb: firstVideo ? firstVideo.thumb : post.thumb || null
  };
}

function resolvePostMedia(key, apiUrl, { provider = 'twitter', fallbackUrl, parsePrimary, parseFallback } = {}) {
  const cached = postVideos.get(key);
  if (cached) return cached;

  const primaryParser = parsePrimary || ((data) => extractPostData(data, provider));
  const fallbackParser = parseFallback || extractBlueskyAppViewPost;

  const pending = fetch(apiUrl)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => normalizeResolvedPost(primaryParser(data)))
    .catch(() => null)
    .then((post) => {
      if (post || !fallbackUrl) return post;
      return fetch(fallbackUrl)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => normalizeResolvedPost(fallbackParser(data)))
        .catch(() => null);
    })
    .then((post) => {
      if (!post) {
        postVideos.delete(key);
        return null;
      }
      return post;
    });

  postVideos.set(key, pending);
  return pending;
}

function tweetVideoUrl(href) {
  const match = String(href || '').match(TWEET_RE);
  if (!match) return Promise.resolve(null);
  return resolvePostMedia('twitter:' + match[1], 'https://api.fxtwitter.com/i/status/' + match[1], { provider: 'twitter' });
}

function blueskyVideoUrl(href) {
  const match = String(href || '').match(BSKY_RE);
  if (!match) return Promise.resolve(null);
  const [handle, rkey] = [match[1], match[2]];
  const uri = `at://${handle}/app.bsky.feed.post/${rkey}`;
  const fallbackUrl =
    'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=' + encodeURIComponent(uri) + '&depth=0&parentHeight=0';
  return resolvePostMedia('bluesky:' + handle + '/' + rkey, 'https://api.fxbsky.app/2/status/' + handle + '/' + rkey, {
    provider: 'bluesky',
    fallbackUrl
  });
}

function instagramPostData(href) {
  const match = String(href || '').match(IG_RE);
  if (!match) return Promise.resolve(null);
  const username = match[1] || '';
  const kind = match[2].toLowerCase() === 'reels' ? 'reel' : match[2].toLowerCase();
  const code = match[3];
  const qs = username ? '?user=' + encodeURIComponent(username) : '';
  return resolvePostMedia(
    'instagram:' + kind + ':' + code,
    '/api/embed/instagram/' + encodeURIComponent(kind) + '/' + encodeURIComponent(code) + qs,
    {
      provider: 'instagram',
      parsePrimary: (data) => (data && data.post ? { ...data.post, provider: 'instagram' } : null)
    }
  );
}

function tiktokPostData(href) {
  const raw = String(href || '').trim();
  const direct = raw.match(TIKTOK_DIRECT_RE);
  const shortMatch = !direct && raw.match(TIKTOK_SHORT_RE);
  if (!direct && !shortMatch) return Promise.resolve(null);
  const id = direct ? direct[3] || direct[4] || direct[5] || direct[6] : null;
  const shortCode = shortMatch ? shortMatch[2] || shortMatch[3] : null;
  const key = id ? 'tiktok:' + id : 'tiktok:short:' + shortCode;
  return resolvePostMedia(key, '/api/embed/tiktok?url=' + encodeURIComponent(raw), {
    provider: 'tiktok',
    parsePrimary: (data) => (data && data.post ? { ...data.post, provider: 'tiktok' } : null)
  });
}

const cytubeRooms = new Map();

const cytubeRoomState = new Map();

function cytubeChannelOf(href) {
  const match = String(href || '').match(CYTUBE_RE);
  return match ? match[1].toLowerCase() : null;
}

function cytubeStreamInfo(channel, { refresh = false } = {}) {
  const cached = cytubeRooms.get(channel);
  if (cached && !refresh) return cached;

  const pending = fetch('/api/cytube/' + encodeURIComponent(channel) + '?live=1')
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);

  cytubeRooms.set(channel, pending);
  return pending;
}

function cytubePosition(info) {
  const at = Number(info.currentTime) || 0;
  if (info.paused || !info.positionAt) return at;
  return at + Math.max(0, Date.now() - Number(info.positionAt)) / 1000;
}

function cytubePlayerUrl(info) {
  if (!info.embedUrl) return null;
  const url = new URL(info.embedUrl, window.location.origin);
  const seconds = Math.floor(cytubePosition(info));
  if (info.offsetParam && seconds >= 1) url.searchParams.set(info.offsetParam, String(seconds));
  if (info.provider === 'youtube') {
    url.searchParams.set('enablejsapi', '1');
    url.searchParams.set('origin', window.location.origin);
  }
  return url.toString();
}

function clockText(seconds) {
  const pad = (value) => String(value).padStart(2, '0');
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours ? `${hours}:${pad(minutes)}:${pad(total % 60)}` : `${minutes}:${pad(total % 60)}`;
}

function cytubeTitleText(info) {
  return info.kind === 'none' ? 'Nothing is playing in this room right now' : 'Now playing: ' + (info.title || 'unknown');
}

function cytubeTimeText(info) {
  if (info.kind === 'none' || !info.seconds) return '';
  return `${clockText(cytubePosition(info))} / ${clockText(info.seconds)}`;
}

const CYTUBE_CLOCK_MIN_MS = 250;
const CYTUBE_CLOCK_MAX_MS = 1000;
const cytubeNotes = new Set();
let cytubeClockTimer = null;

function setCytubeClock(note) {
  const time = note.querySelector('.cytube-time');
  if (!time) return;
  const text = note.cytubeInfo ? cytubeTimeText(note.cytubeInfo) : '';
  const shown = text ? ` \u00b7 ${text}` : '';
  if (time.textContent !== shown) time.textContent = shown;
  time.hidden = !text;
}

function runCytubeClock() {
  cytubeClockTimer = null;
  let wait = null;

  for (const note of [...cytubeNotes]) {
    if (note.isConnected) note.cytubeInPage = true;
    else if (note.cytubeInPage) {
      cytubeNotes.delete(note);
      continue;
    }

    const info = note.cytubeInfo;
    if (!info) continue;
    if (!document.hidden) setCytubeClock(note);
    const next = info.paused ? CYTUBE_CLOCK_MAX_MS : (1 - (cytubePosition(info) % 1)) * CYTUBE_CLOCK_MAX_MS;
    wait = wait === null ? next : Math.min(wait, next);
  }

  if (wait === null) wait = cytubeNotes.size ? CYTUBE_CLOCK_MIN_MS : null;
  if (wait !== null) {
    cytubeClockTimer = setTimeout(runCytubeClock, Math.max(CYTUBE_CLOCK_MIN_MS, Math.min(CYTUBE_CLOCK_MAX_MS, wait)));
  }
}

function updateCytubeNote(note, info) {
  note.cytubeInfo = info;
  const title = note.querySelector('.cytube-title');
  if (title) title.textContent = cytubeTitleText(info);

  setCytubeClock(note);
  cytubeNotes.add(note);
  if (cytubeClockTimer === null) runCytubeClock();
}

const CYTUBE_DRIFT_SECONDS = 15;

const YOUTUBE_SEEK_GRACE_MS = 2500;

const YOUTUBE_ORIGIN = 'https://www.youtube.com';
const youtubePlayers = new WeakMap();

function trackPlayer(media, info) {
  if (!media) return media;
  if (media.tagName === 'IFRAME' && info.provider === 'youtube') trackYouTube(media, info);
  else if (media.tagName === 'VIDEO') guardCytubePosition(media, info.channel);
  return media;
}

let youtubePlayerSeq = 0;

function tellYouTubeListening(iframe) {
  if (!iframe || !iframe.contentWindow) return;
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: 'listening', id: iframe.id, channel: 'widget' }),
    YOUTUBE_ORIGIN
  );
}

function trackYouTube(iframe, info) {
  const track = {
    channel: info.channel,
    seconds: Math.max(0, cytubePosition(info)),
    at: Date.now(),
    playing: false,
    reported: false,
    seekAt: Date.now()
  };
  if (iframe.contentWindow) youtubePlayers.set(iframe.contentWindow, track);

  tellYouTubeListening(iframe);
  iframe.addEventListener('load', () => tellYouTubeListening(iframe));
}

window.addEventListener('message', (event) => {
  if (event.origin !== YOUTUBE_ORIGIN || !event.source) return;
  let message;
  try {
    message = JSON.parse(event.data);
  } catch {
    return;
  }
  const track = youtubePlayers.get(event.source);
  if (!track) return;
  track.reported = true;
  if (message.event !== 'onStateChange') return;
  const now = Date.now();
  if (track.playing) track.seconds += (now - track.at) / 1000;
  track.at = now;
  track.playing = message.info === 1;
  if (message.info === 1 || message.info === 3) dismissYouTubeMove(track, event.source);
});

function commandYouTubeSeek(track, source, target) {
  if (!source || !Number.isFinite(target) || target < 0) return;
  track.seekAt = Date.now();
  track.seconds = target;
  track.at = track.seekAt;
  source.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [Math.floor(target), true] }), YOUTUBE_ORIGIN);
}

function dismissYouTubeMove(track, source) {
  if (!track || Date.now() - track.seekAt < YOUTUBE_SEEK_GRACE_MS) return;
  const room = cytubeRoomState.get(track.channel);
  if (room) commandYouTubeSeek(track, source, cytubePosition(room));
}

function guardCytubePosition(media, channel) {
  media.addEventListener('seeked', () => {
    if (media.cytubeSeeking) {
      media.cytubeSeeking = false;
      return;
    }
    const room = cytubeRoomState.get(channel);
    if (room) restoreCytubePosition(media, room);
  });
  media.addEventListener('play', () => {
    const room = cytubeRoomState.get(channel);
    if (room) restoreCytubePosition(media, room);
  });
}

function restoreCytubePosition(media, info) {
  const target = cytubePosition(info);
  if (!media || !Number.isFinite(target) || target < 0) return;
  media.cytubeSeeking = true;
  try {
    media.currentTime = target;
  } catch {
    media.cytubeSeeking = false;
    return;
  }
  setTimeout(() => {
    if (media) media.cytubeSeeking = false;
  }, 500);
}

function youtubePosition(track) {
  return Math.max(0, track.seconds + (track.playing ? (Date.now() - track.at) / 1000 : 0));
}

function seekCytubeMedia(media, info) {
  const target = cytubePosition(info);
  if (!media || target < 1) return;
  if (!media.isConnected) return;

  if (media.tagName === 'VIDEO') {
    if (media.paused) return;
    if (Math.abs(media.currentTime - target) >= CYTUBE_DRIFT_SECONDS) restoreCytubePosition(media, info);
    return;
  }

  if (media.tagName !== 'IFRAME' || info.provider !== 'youtube') return;
  const track = media.contentWindow && youtubePlayers.get(media.contentWindow);
  if (!track || Date.now() - track.seekAt < YOUTUBE_SEEK_GRACE_MS) return;

  if (!track.reported) return commandYouTubeSeek(track, media.contentWindow, target);

  if (!track.playing) return;
  if (Math.abs(youtubePosition(track) - target) < CYTUBE_DRIFT_SECONDS) return;
  commandYouTubeSeek(track, media.contentWindow, target);
}

const cytubeWatchers = new Map();
const CYTUBE_POLL_MS = 5000;

function watchCytubeBlock(channel, block) {
  let watcher = cytubeWatchers.get(channel);
  if (!watcher) {
    watcher = { channel, blocks: new Set(), timer: null };
    cytubeWatchers.set(channel, watcher);
    watcher.timer = setInterval(() => pollCytubeRoom(watcher), CYTUBE_POLL_MS);
  }
  watcher.blocks.add(block);
  return block;
}

async function pollCytubeRoom(watcher) {
  if (document.hidden) return;

  const info = await cytubeStreamInfo(watcher.channel, { refresh: true });
  for (const block of [...watcher.blocks]) {
    if (!block.alive()) watcher.blocks.delete(block);
    else if (info) block.update(info);
  }

  if (!watcher.blocks.size) {
    clearInterval(watcher.timer);
    cytubeWatchers.delete(watcher.channel);
  }
}

function cytubePlayer(info) {
  const note = document.createElement('div');
  note.className = 'cytube-note';

  const title = document.createElement('span');
  title.className = 'cytube-title';
  note.appendChild(title);

  const time = document.createElement('span');
  time.className = 'cytube-time';
  note.appendChild(time);

  note.appendChild(document.createTextNode(' \u00b7 '));
  const join = document.createElement('a');
  join.href = info.roomUrl;
  join.target = '_blank';
  join.rel = 'noopener noreferrer';
  join.textContent = 'Join the room';
  note.appendChild(join);
  if (info.note) note.appendChild(document.createTextNode(' (' + info.note + ')'));
  updateCytubeNote(note, info);

  if (info.kind === 'embed' && info.embedUrl) {
    const iframe = document.createElement('iframe');
    iframe.id = `cytube-player-${(youtubePlayerSeq += 1)}`;
    iframe.loading = 'lazy';
    iframe.width = '640';
    iframe.height = '360';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.style.maxWidth = '100%';
    iframe.src = cytubePlayerUrl(info) || info.embedUrl;
    return { note, media: iframe };
  }

  if (info.kind === 'video' && info.videoUrl) {
    const video = document.createElement('video');
    video.controls = true;
    video.style.maxWidth = '100%';
    const source = document.createElement('source');
    source.src = info.videoUrl;
    if (info.mime) source.type = info.mime;
    video.appendChild(source);
    if (info.currentTime > 0) {
      const seek = () => {
        try {
          video.currentTime = cytubePosition(info);
        } catch {
        }
      };
      if (video.readyState >= 1) seek();
      else video.addEventListener('loadedmetadata', seek, { once: true });
    }
    return { note, media: video };
  }

  return { note, media: null };
}

function refreshCytubeBlockMeta(container, info) {
  const block = container.closest('details');
  if (!block) return;

  const label = block.querySelector('.cytube-now-playing');
  if (label) label.textContent = info.kind === 'none' ? 'nothing playing now' : info.title || 'unknown';

  const poster = block.querySelector('.image-container img');
  if (poster && info.coverUrl && poster.getAttribute('src') !== info.coverUrl) {
    poster.setAttribute('src', info.coverUrl);
    poster.setAttribute('data-thumb', info.coverUrl);
  }
}

function mountCytubeBlock(container) {
  const channel = (container.dataset.channel || '').toLowerCase();
  if (!channel) return;

  const fallback = container.querySelector('.cytube-play');
  container.dataset.cytubeMounted = 'true';
  container.textContent = 'Reading the room\u2026';

  let shown = null;
  let media = null;

  const render = (info) => {
    const player = cytubePlayer(info);
    container.textContent = '';
    container.appendChild(player.note);
    if (player.media) container.appendChild(player.media);
    else if (info.kind !== 'none' && fallback) container.appendChild(fallback);
    media = trackPlayer(player.media, info);
  };

  const apply = (info) => {
    if (!info) {
      container.textContent = '';
      if (fallback) container.appendChild(fallback);
      return;
    }

    cytubeRoomState.set(channel, info);
    const key = info.kind === 'none' ? 'idle' : `${info.type}:${info.mediaId}`;
    if (key !== shown) {
      shown = key;
      return render(info);
    }

    const note = container.querySelector('.cytube-note');
    if (note) updateCytubeNote(note, info);
    seekCytubeMedia(media, info);
  };

  cytubeStreamInfo(channel).then(apply);
  watchCytubeBlock(channel, { alive: () => container.isConnected, update: apply });
}

function isModifiedClick(e) {
  return e.which === 2 || e.ctrlKey;
}
function makeHideLink() {
  const a = document.createElement('a');
  a.textContent = '[ - ]';
  a.className = 'hide-link';
  a.style.cursor = 'pointer';
  a.style.display = 'none';
  return a;
}

function cloneThumbLink(link, mime) {
  const a = document.createElement('a');
  a.href = link.href;
  a.className = link.className;
  a.dataset.mime = mime;
  if (link.dataset.fileWidth) a.dataset.fileWidth = link.dataset.fileWidth;
  if (link.dataset.fileHeight) a.dataset.fileHeight = link.dataset.fileHeight;
  const img = link.querySelector('img');
  if (img) {
    const thumb = img.cloneNode(true);
    thumb.style.cursor = 'pointer';
    a.appendChild(thumb);
  }
  return a;
}

function wireToggle(parent, thumbLink, media, hideLink, onShow, onHide) {
  hideLink.onclick = () => {
    parent.classList.remove('expanded-cell');
    thumbLink.style.display = 'inline';
    media.style.display = 'none';
    hideLink.style.display = 'none';
    onHide?.();
  };
  thumbLink.onclick = (e) => {
    if (isModifiedClick(e)) return true;
    parent.classList.add('expanded-cell');
    thumbLink.style.display = 'none';
    media.style.display = 'inline';
    hideLink.style.display = 'inline';
    onShow?.();
    return false;
  };
}

const thumbs = {
  expandImage(e, link, mime) {
    if (isModifiedClick(e)) return true;

    const parent = link.parentNode;
    const thumb = link.querySelector('img');
    if (!thumb) return false;

    let expanded = link.querySelector('.img-expanded');

    if (thumb.style.display === 'none') {
      parent.classList.remove('expanded-cell');
      if (expanded) expanded.style.display = 'none';
      thumb.style.display = '';
      if (thumb.getBoundingClientRect().top < 0) thumb.scrollIntoView();
      return false;
    }

    parent.classList.add('expanded-cell');
    if (expanded) {
      thumb.style.display = 'none';
      expanded.style.display = '';
      return false;
    }

    if (thumb.src === link.href && mime !== 'image/svg+xml') return false;

    parent.querySelector('.img-unsupported')?.remove();
    expanded = document.createElement('img');
    expanded.src = link.href;
    expanded.className = 'img-expanded';
    expanded.addEventListener('error', () => {
      expanded.remove();
      thumb.style.display = '';
      parent.classList.remove('expanded-cell');
      const open = document.createElement('a');
      open.href = link.href;
      open.textContent = 'open the file';
      open.addEventListener('click', (e) => e.stopPropagation());
      const notice = document.createElement('span');
      notice.className = 'img-unsupported';
      notice.append("This browser can't show this picture - ", open);
      parent.appendChild(notice);
    });
    thumb.style.display = 'none';
    link.appendChild(expanded);
    return false;
  },

  setPlayer(link, mime, autoExpand) {
    const parent = link.parentNode;
    const isVideo = VIDEO_TYPES.has(mime);
    const media = document.createElement(isVideo ? 'video' : 'audio');
    if (isVideo) media.loop = localStorage.noAutoLoop !== 'true';
    media.controls = true;
    media.style.display = 'none';

    const container = document.createElement('span');
    const hideLink = makeHideLink();
    const thumbLink = cloneThumbLink(link, mime);
    const src = document.createElement('source');
    src.src = link.href;
    src.type = mime;

    wireToggle(
      parent,
      thumbLink,
      media,
      hideLink,
      () => {
        if (!media.querySelector('source')) media.appendChild(src);
        media.play();
      },
      () => media.pause()
    );

    container.append(hideLink, media, thumbLink);
    parent.replaceChild(container, link);
    if (autoExpand) thumbLink.onclick({ which: 1 });
  },

  setTwitchLink(link, mime, autoExpand) {
    const parent = link.parentNode;
    const container = document.createElement('span');
    const hideLink = makeHideLink();
    const thumbLink = cloneThumbLink(link, mime);
    const panel = document.createElement('span');
    panel.style.display = 'none';
    panel.appendChild(twitchEmbedNote(twitchWatchUrlFor(embedUrlFor(link.href)) || link.href, twitchFrameRefusalReason()));

    wireToggle(parent, thumbLink, panel, hideLink);
    container.append(hideLink, panel, thumbLink);
    parent.replaceChild(container, link);
    if (autoExpand) thumbLink.onclick({ which: 1 });
  },

  setEmbedVideo(link, mime, autoExpand) {
    const embedUrl = embedUrlFor(link.href);
    if (!embedUrl) return;

    if (mime === 'twitch/video' && !twitchCanBeFramed()) return this.setTwitchLink(link, mime, autoExpand);

    const parent = link.parentNode;
    const container = document.createElement('span');
    const hideLink = makeHideLink();
    const thumbLink = cloneThumbLink(link, mime);
    const iframe = document.createElement('iframe');
    iframe.loading = 'lazy';
    iframe.width = '640';
    iframe.height = '360';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.style.maxWidth = '100%';
    iframe.style.display = 'none';

    wireToggle(
      parent,
      thumbLink,
      iframe,
      hideLink,
      () => {
        if (!iframe.src) iframe.src = embedUrl;
      },
      () => {
        iframe.removeAttribute('src');
      }
    );

    container.append(hideLink, iframe, thumbLink);
    parent.replaceChild(container, link);
    if (autoExpand) thumbLink.onclick({ which: 1 });
  },

  setVocarooAudio(link, mime, autoExpand) {
    const id = vocarooIdFrom(link.href);
    if (!id) return this.setEmbedVideo(link, mime, autoExpand);

    const parent = link.parentNode;
    const media = vocarooAudio(id);
    media.style.display = 'none';

    const container = document.createElement('span');
    const hideLink = makeHideLink();
    const thumbLink = cloneThumbLink(link, mime);

    wireToggle(
      parent,
      thumbLink,
      media,
      hideLink,
      () => media.play().catch(() => {}),
      () => media.pause()
    );

    container.append(hideLink, media, thumbLink);
    parent.replaceChild(container, link);
    if (autoExpand) thumbLink.onclick({ which: 1 });
  },

  setPostVideo(link, mime, autoExpand) {
    const resolve = mime === 'bluesky/video' ? blueskyVideoUrl : tweetVideoUrl;
    const parent = link.parentNode;
    const media = document.createElement('video');
    media.controls = true;
    media.loop = localStorage.noAutoLoop !== 'true';
    media.style.display = 'none';

    const container = document.createElement('span');
    const hideLink = makeHideLink();
    const thumbLink = cloneThumbLink(link, mime);
    let loaded = false;

    wireToggle(
      parent,
      thumbLink,
      media,
      hideLink,
      () => {
        resolve(link.href).then((post) => {
          if (!post || !post.url) {
            if (!loaded) window.location.href = link.href;
            return;
          }
          if (!loaded) {
            const src = document.createElement('source');
            src.src = post.url;
            src.type = 'video/mp4';
            media.appendChild(src);
            loaded = true;
          }
        });
      },
      () => media.pause()
    );

    container.append(hideLink, media, thumbLink);
    parent.replaceChild(container, link);
    if (autoExpand) thumbLink.onclick({ which: 1 });
  },

  setCytubeStream(link, mime, autoExpand) {
    const channel = cytubeChannelOf(link.href);
    if (!channel) return;

    const parent = link.parentNode;
    const container = document.createElement('span');
    const hideLink = makeHideLink();
    const thumbLink = cloneThumbLink(link, mime);
    const panel = document.createElement('div');
    panel.className = 'cytube-stream';
    panel.textContent = 'Reading the room\u2026';
    panel.style.display = 'none';

    let info = null;
    let media = null;
    let active = false;

    const mount = (data) => {
      const player = cytubePlayer(data);
      refreshCytubeBlockMeta(container, data);
      panel.textContent = '';
      panel.appendChild(player.note);
      media = player.media;
      if (media) panel.appendChild(media);
      trackPlayer(media, data);
    };

    const showRoomLink = () => {
      const fallback = document.createElement('a');
      fallback.href = link.href;
      fallback.target = '_blank';
      fallback.rel = 'noopener noreferrer';
      fallback.textContent = 'Open the room on cytu.be';
      panel.textContent = '';
      panel.appendChild(fallback);
    };

    const apply = (data, { remount = false } = {}) => {
      if (!data) return showRoomLink();
      const changed = !info || data.type !== info.type || data.mediaId !== info.mediaId;
      info = data;
      cytubeRoomState.set(channel, data);
      refreshCytubeBlockMeta(container, data);
      if (!active) return; 
      if (remount || changed) return mount(data);
      const note = panel.querySelector('.cytube-note');
      if (note) updateCytubeNote(note, data);
      seekCytubeMedia(media, data);
    };

    wireToggle(
      parent,
      thumbLink,
      panel,
      hideLink,
      () => {
        active = true;
        cytubeStreamInfo(channel, { refresh: true }).then((data) => apply(data || info, { remount: true }));
      },
      () => {
        active = false;
        if (!media) return;
        if (media.tagName === 'IFRAME') media.removeAttribute('src');
        else media.pause();
      }
    );

    container.append(hideLink, panel, thumbLink);
    parent.replaceChild(container, link);
    if (autoExpand) thumbLink.onclick({ which: 1 });
    watchCytubeBlock(channel, { alive: () => container.isConnected, update: apply });
  },

  mountVocarooBlock(container) {
    const id = vocarooIdFrom(container.dataset.url);
    if (!id) return;
    container.dataset.vocarooMounted = 'true';

    const details = container.closest('details');
    let mounted = false;
    const mount = () => {
      if (mounted) return;
      mounted = true;
      container.textContent = '';
      container.appendChild(vocarooAudio(id));
    };

    if (!details) return mount();
    if (details.open) return mount();
    details.addEventListener('toggle', () => details.open && mount(), { once: true });
  },

  buildPostMediaList(items) {
    const wrap = document.createElement('div');
    wrap.className = 'post-embed-media' + (items.length > 1 ? ' post-embed-media-multi' : '');
    for (const item of items) {
      if (item.kind === 'video') {
        const video = document.createElement('video');
        video.className = 'post-embed-video';
        video.controls = true;
        video.preload = 'metadata';
        if (item.loop) video.loop = true;
        if (item.thumb) video.poster = item.thumb;
        const source = document.createElement('source');
        source.src = item.url;
        source.type = 'video/mp4';
        video.appendChild(source);
        wrap.appendChild(video);
      } else if (item.kind === 'image') {
        const link = document.createElement('a');
        link.className = 'post-embed-image-link';
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const img = document.createElement('img');
        img.className = 'post-embed-image';
        img.src = item.url;
        img.loading = 'lazy';
        img.alt = item.alt || '';
        link.appendChild(img);
        wrap.appendChild(link);
      }
    }
    return wrap;
  },

  buildPostEmbedCard(post, fallbackUrl) {
    const PROVIDER_NAMES = {
      twitter: 'X',
      bluesky: 'Bluesky',
      instagram: 'Instagram',
      tiktok: 'TikTok'
    };
    const provider = post.provider || 'twitter';
    const card = document.createElement('div');
    card.className = 'post-embed-card post-embed-provider-' + provider;

    const header = document.createElement('div');
    header.className = 'post-embed-header';
    const author = post.author || {};
    if (isSafeMediaUrl(author.avatar)) {
      const avatar = document.createElement('img');
      avatar.className = 'post-embed-avatar';
      avatar.src = author.avatar;
      avatar.alt = '';
      avatar.loading = 'lazy';
      avatar.setAttribute('referrerpolicy', 'no-referrer');
      header.appendChild(avatar);
    }

    const authorWrap = document.createElement('div');
    authorWrap.className = 'post-embed-author';
    const displayName = author.name || (author.handle ? '@' + author.handle : PROVIDER_NAMES[provider] || 'Post');
    const nameTag = isSafeMediaUrl(author.url) ? document.createElement('a') : document.createElement('span');
    nameTag.className = 'post-embed-name';
    nameTag.textContent = displayName;
    if (nameTag.tagName === 'A') {
      nameTag.href = author.url;
      nameTag.target = '_blank';
      nameTag.rel = 'noopener noreferrer';
    }
    authorWrap.appendChild(nameTag);
    if (author.handle) {
      const handleEl = document.createElement('span');
      handleEl.className = 'post-embed-handle';
      handleEl.textContent = '@' + author.handle;
      authorWrap.appendChild(handleEl);
    }
    header.appendChild(authorWrap);

    const badge = document.createElement('span');
    badge.className = 'post-embed-badge';
    badge.textContent = PROVIDER_NAMES[provider] || 'Embed';
    header.appendChild(badge);
    card.appendChild(header);

    if (post.text) {
      const textEl = document.createElement('div');
      textEl.className = 'post-embed-text';
      textEl.textContent = post.text;
      card.appendChild(textEl);
    }

    if (Array.isArray(post.items) && post.items.length) {
      card.appendChild(this.buildPostMediaList(post.items));
    }

    if (isSafeMediaUrl(post.iframeUrl)) {
      const frameWrap = document.createElement('div');
      frameWrap.className = 'post-embed-tiktok-wrap';
      const iframe = document.createElement('iframe');
      iframe.className = 'post-embed-tiktok-frame';
      iframe.setAttribute('src', post.iframeUrl);
      iframe.loading = 'lazy';
      iframe.allowFullscreen = true;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'encrypted-media; fullscreen; picture-in-picture');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      frameWrap.appendChild(iframe);
      card.appendChild(frameWrap);
    }

    if (post.quote && (post.quote.text || (Array.isArray(post.quote.items) && post.quote.items.length))) {
      const qBox = document.createElement('div');
      qBox.className = 'post-embed-quote';
      const qAuthor = post.quote.author || {};
      if (qAuthor.name || qAuthor.handle) {
        const qHeader = document.createElement('div');
        qHeader.className = 'post-embed-quote-header';
        const qName = document.createElement('span');
        qName.className = 'post-embed-name';
        qName.textContent = qAuthor.name || '@' + qAuthor.handle;
        qHeader.appendChild(qName);
        if (qAuthor.handle) {
          const qHandle = document.createElement('span');
          qHandle.className = 'post-embed-handle';
          qHandle.textContent = ' @' + qAuthor.handle;
          qHeader.appendChild(qHandle);
        }
        qBox.appendChild(qHeader);
      }
      if (post.quote.text) {
        const qText = document.createElement('div');
        qText.className = 'post-embed-text';
        qText.textContent = post.quote.text;
        qBox.appendChild(qText);
      }
      if (Array.isArray(post.quote.items) && post.quote.items.length) {
        qBox.appendChild(this.buildPostMediaList(post.quote.items));
      }
      card.appendChild(qBox);
    }

    const footer = document.createElement('div');
    footer.className = 'post-embed-footer';
    const metaParts = [];
    if (post.createdAt) {
      const parsed = new Date(post.createdAt);
      if (!Number.isNaN(parsed.getTime())) metaParts.push(parsed.toLocaleString());
    }
    if (post.stats) {
      const statBits = [];
      if (typeof post.stats.replies === 'number') statBits.push(post.stats.replies + ' replies');
      if (typeof post.stats.reposts === 'number') statBits.push(post.stats.reposts + ' reposts');
      if (typeof post.stats.likes === 'number') statBits.push(post.stats.likes + ' likes');
      if (statBits.length) metaParts.push(statBits.join(' \u00b7 '));
    }
    if (metaParts.length) {
      const statsEl = document.createElement('span');
      statsEl.className = 'post-embed-stats';
      statsEl.textContent = metaParts.join(' \u00b7 ');
      footer.appendChild(statsEl);
    }
    const extUrl = isSafeMediaUrl(post.postUrl) ? post.postUrl : fallbackUrl;
    if (isSafeMediaUrl(extUrl)) {
      const link = document.createElement('a');
      link.className = 'post-embed-link';
      link.href = extUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'View on ' + (PROVIDER_NAMES[provider] || 'site');
      footer.appendChild(link);
    }
    card.appendChild(footer);
    return card;
  },

  mountPostVideoBlock(container) {
    const postUrl = container.dataset.url;
    if (!postUrl) return;
    container.dataset.postVideoMounted = 'true';

    const details = container.closest('details');
    const provider = container.dataset.provider || 'twitter';
    const LABELS = {
      bluesky: 'Bluesky post',
      instagram: 'Instagram post',
      tiktok: 'TikTok post',
      twitter: 'Twitter/X post'
    };
    const RESOLVERS = {
      bluesky: blueskyVideoUrl,
      instagram: instagramPostData,
      tiktok: tiktokPostData,
      twitter: tweetVideoUrl
    };
    const providerLabel = LABELS[provider] || 'post';
    const resolve = RESOLVERS[provider] || tweetVideoUrl;
    let asked = false;
    const show = () => {
      if (asked) {
        container.querySelectorAll('iframe.post-embed-tiktok-frame[data-src]').forEach((frame) => {
          const src = frame.getAttribute('data-src');
          if (src) {
            frame.removeAttribute('data-src');
            frame.setAttribute('src', src);
          }
        });
        return;
      }
      asked = true;
      const status = document.createElement('div');
      status.className = 'post-embed-status';
      status.textContent = 'Loading post\u2026';
      container.textContent = '';
      container.appendChild(status);

      resolve(postUrl).then((post) => {
        if (post) {
          container.textContent = '';
          container.appendChild(this.buildPostEmbedCard({ provider, ...post }, postUrl));
          return;
        }

        const empty = document.createElement('div');
        empty.className = 'post-embed-status';
        empty.appendChild(document.createTextNode(`Could not load this ${providerLabel} \u2014 `));
        const fallbackLink = document.createElement('a');
        fallbackLink.className = 'post-video-play';
        fallbackLink.href = postUrl;
        fallbackLink.target = '_blank';
        fallbackLink.rel = 'noopener noreferrer';
        fallbackLink.textContent = 'open post';
        empty.appendChild(fallbackLink);
        container.textContent = '';
        container.appendChild(empty);
      });
    };

    if (!details) return show();
    details.addEventListener('toggle', () => {
      if (details.open) {
        show();
      } else {
        container.querySelectorAll('video').forEach((v) => v.pause?.());
        container.querySelectorAll('iframe.post-embed-tiktok-frame[src]').forEach((frame) => {
          const src = frame.getAttribute('src');
          if (src) {
            frame.setAttribute('data-src', src);
            frame.removeAttribute('src');
          }
        });
      }
    });
    if (details.open) show();
  },

  processImageLink(link) {
    const mime = link.getAttribute('data-mime') || '';
    if (mime.startsWith('image/')) {
      link.addEventListener('click', (e) => {
        if (isModifiedClick(e)) return;
        e.preventDefault();
        this.expandImage(e, link, mime);
      });
    } else if (PLAYABLE_TYPES.has(mime)) {
      link.addEventListener(
        'click',
        (e) => {
          if (isModifiedClick(e)) return;
          e.preventDefault();
          this.setPlayer(link, mime, true);
        },
        { once: true }
      );
    } else if (mime === 'twitter/video' || mime === 'bluesky/video') {
      link.addEventListener(
        'click',
        (e) => {
          if (isModifiedClick(e)) return;
          e.preventDefault();
          this.setPostVideo(link, mime, true);
        },
        { once: true }
      );
    } else if (mime === 'cytube/stream') {
      this.setCytubeStream(link, mime, true);
    } else if (mime === 'vocaroo/audio') {
      link.addEventListener(
        'click',
        (e) => {
          if (isModifiedClick(e)) return;
          e.preventDefault();
          this.setVocarooAudio(link, mime, true);
        },
        { once: true }
      );
    } else if (mime === 'youtube/video' || mime === 'nicovideo/video' || mime === 'bilibili/video' || mime === 'twitch/video' || mime === 'tiktok/video') {
      link.addEventListener(
        'click',
        (e) => {
          if (isModifiedClick(e)) return;
          e.preventDefault();
          this.setEmbedVideo(link, mime, true);
        },
        { once: true }
      );
    }
  }
};

window.initializeThumbnails = function () {
  fixTwitchFrames(document);

  loadDeferredEmbeds(document);

  document.querySelectorAll('.image-container:not([data-initialized])').forEach((container) => {
    const link = container.querySelector('.media-toggle');
    if (!link) return;
    container.dataset.initialized = 'true';
    thumbs.processImageLink(link);
  });

  document.querySelectorAll('.cytube-stream:not([data-cytube-mounted])').forEach((container) => {
    if (container.querySelector('.cytube-play')) mountCytubeBlock(container);
  });

  document.querySelectorAll('.post-video:not([data-post-video-mounted])').forEach((container) => {
    if (container.querySelector('.post-video-play')) thumbs.mountPostVideoBlock(container);
  });

  document.querySelectorAll('.vocaroo-embed:not([data-vocaroo-mounted])').forEach((container) => {
    if (container.querySelector('.vocaroo-embed-play')) thumbs.mountVocarooBlock(container);
  });
};

window.thumbs = thumbs;

(function () {
  const MARGIN = 13.3333;

  let hoverPreview = null;
  let hoverPreviewParams = null;
  let bound = false;
  let enabled = false;
  let follow = false;
  let restrict = false;

  function refreshFlags() {
    enabled = localStorage.getItem('imagePreviewHover') === 'true';
    follow = localStorage.getItem('imagePreviewFollowCursor') === 'true';
    restrict = localStorage.getItem('imagePreviewRestrictSize') === 'true';
  }

  function headerHeight() {
    const header = document.querySelector('.header');
    return header ? header.offsetHeight : 24;
  }

  function getHoverTarget(el) {
    if (!(el instanceof Element)) return null;
    const img = el.closest('.thread-image, .reply-image, .catalog-image');
    if (!img || img.style.display === 'none') return null;
    const link = img.closest('.media-toggle');
    if (!link) return null;
    const mime = link.getAttribute('data-mime') || '';
    if (!mime.startsWith('image/')) return null;
    const expanded = link.querySelector('.img-expanded');
    if (expanded && expanded.style.display !== 'none' && expanded.src) return null;
    const full = img.dataset.full || link.getAttribute('href');
    if (!full || full === img.getAttribute('src')) return null;
    return { link, img, full };
  }

  function getFileDimensions(link, img) {
    let fileWidth = parseInt(link.dataset.fileWidth, 10);
    let fileHeight = parseInt(link.dataset.fileHeight, 10);
    if (fileWidth > 0 && fileHeight > 0) return { fileWidth, fileHeight };
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      return { fileWidth: img.naturalWidth, fileHeight: img.naturalHeight };
    }
    return {
      fileWidth: parseInt(img.getAttribute('width'), 10) || 200,
      fileHeight: parseInt(img.getAttribute('height'), 10) || 200
    };
  }

  function updateHoverPreviewPosition(clientX, clientY) {
    if (!hoverPreview || !hoverPreviewParams) return;

    const { thumb, rect, fileWidth, fileHeight, headerH } = hoverPreviewParams;
    const margin = MARGIN * (clientX === undefined ? 1 : 2);
    const { clientWidth, clientHeight } = document.documentElement;

    const startLeft = clientX === undefined ? rect.left : clientX;
    const startRight = clientX === undefined ? rect.right : clientX;
    const spaceLeft = startLeft - margin * 2;
    const spaceRight = clientWidth - startRight - margin * 2;
    const appearLeft = spaceLeft > spaceRight;
    const maxHoverW = restrict ? (appearLeft ? spaceLeft : spaceRight) : clientWidth - margin * 2;
    const maxHoverH = clientHeight - headerH - margin * 2;
    const scale = Math.min(1, maxHoverW / fileWidth, maxHoverH / fileHeight);

    hoverPreview.style.maxWidth = `${maxHoverW}px`;
    hoverPreview.style.maxHeight = `${maxHoverH}px`;
    hoverPreview.style.left = '';
    hoverPreview.style.right = '';

    if (appearLeft) {
      if (restrict || fileWidth * scale < spaceLeft) {
        hoverPreview.style.right = `${clientWidth - startLeft + margin}px`;
      } else {
        hoverPreview.style.left = `${margin}px`;
      }
    } else if (restrict || fileWidth * scale < spaceRight) {
      hoverPreview.style.left = `${startRight + margin}px`;
    } else {
      hoverPreview.style.right = `${clientWidth - maxHoverW - margin}px`;
    }

    const hoverHeight = fileHeight * scale;
    const wantedTop =
      clientY !== undefined ? clientY - hoverHeight / 2 : rect.top + thumb.offsetHeight / 2 - hoverHeight / 2;
    const minTop = headerH + margin;
    const maxTop = clientHeight - hoverHeight - margin;
    hoverPreview.style.top = `${wantedTop < minTop ? minTop : wantedTop > maxTop ? maxTop : wantedTop}px`;
  }

  function hideHoverPreview() {
    hoverPreview?.remove();
    hoverPreview = null;
    hoverPreviewParams = null;
    document.removeEventListener('pointermove', onHoverMove);
  }

  function onHoverMove(e) {
    const { clientX, clientY } = e;
    if (hoverPreview && hoverPreviewParams?.thumb?.contains(document.elementFromPoint(clientX, clientY))) {
      if (follow) updateHoverPreviewPosition(clientX, clientY);
      return;
    }
    hideHoverPreview();
  }

  function onImgLinkHover(data) {
    const { link, img, full } = data;
    const { fileWidth, fileHeight } = getFileDimensions(link, img);
    if (!fileWidth || !fileHeight) return;

    hideHoverPreview();

    hoverPreviewParams = {
      thumb: img,
      link,
      rect: img.getBoundingClientRect(),
      fileWidth,
      fileHeight,
      headerH: headerHeight()
    };

    hoverPreview = document.createElement('img');
    hoverPreview.className = 'hover-preview';
    hoverPreview.onerror = () => hideHoverPreview();
    hoverPreview.src = full;
    document.body.append(hoverPreview);
    updateHoverPreviewPosition();
    document.addEventListener('pointermove', onHoverMove);
  }

  function onPointerEnter(e) {
    if (!enabled) return;
    const data = getHoverTarget(e.target);
    if (data) onImgLinkHover(data);
  }

  function onDocumentPointerLeave(e) {
    if (e.relatedTarget === null) hideHoverPreview();
  }

  function bind() {
    if (bound) return;
    bound = true;
    document.addEventListener('pointerenter', onPointerEnter, true);
    document.addEventListener('click', hideHoverPreview, true);
    document.documentElement.addEventListener('pointerleave', onDocumentPointerLeave);
  }

  function unbind() {
    if (!bound) return;
    bound = false;
    document.removeEventListener('pointerenter', onPointerEnter, true);
    document.removeEventListener('click', hideHoverPreview, true);
    document.documentElement.removeEventListener('pointerleave', onDocumentPointerLeave);
    hideHoverPreview();
  }

  window.imagePreview = {
    update() {
      refreshFlags();
      if (enabled) bind();
      else unbind();
    }
  };
})();

function initThumbPage() {
  initializeThumbnails();
  window.imagePreview.update();
}

document.addEventListener('DOMContentLoaded', initThumbPage);
document.addEventListener('contentAdded', initializeThumbnails);
