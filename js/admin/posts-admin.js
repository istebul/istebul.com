/**
 * Admin — Güncel haberler (news) ve Blog (blog) içerik operasyonları.
 */

import { escapeHtml, safeAttr } from '../core/dom-safe.js';
import { uploadPostCoverImage } from './post-cover-upload.js';

const POSTS_CONFIG = Object.freeze({
  news: {
    contentType: 'news',
    listId: 'news-posts-list',
    filterId: 'news-list-filter',
    formTitleId: 'news-form-title',
    editorCardId: 'news-editor-card',
    fields: {
      title: 'news-post-title',
      slug: 'news-post-slug',
      category: 'news-post-category',
      excerpt: 'news-post-excerpt',
      coverHidden: 'news-post-cover-url',
      coverFile: 'news-post-cover-file',
      coverPreview: 'news-post-cover-preview',
      sourceLabel: 'news-post-source-label',
      sourceUrl: 'news-post-source-url',
      content: 'news-post-content',
      published: 'news-post-published',
      featured: 'news-post-featured'
    },
    saveAction: 'save-news-post',
    cancelAction: 'cancel-news-edit',
    editAction: 'edit-news-post',
    toggleAction: 'toggle-news-post',
    toggleFeaturedAction: 'toggle-news-featured',
    deleteAction: 'delete-news-post'
  },
  blog: {
    contentType: 'blog',
    listId: 'blog-posts-list',
    filterId: 'blog-list-filter',
    formTitleId: 'blog-form-title',
    editorCardId: 'blog-editor-card',
    fields: {
      title: 'blog-post-title',
      slug: 'blog-post-slug',
      category: 'blog-post-category',
      excerpt: 'blog-post-excerpt',
      coverHidden: 'blog-post-cover-url',
      coverFile: 'blog-post-cover-file',
      coverPreview: 'blog-post-cover-preview',
      coverUrlFallback: 'blog-post-cover-external',
      sourceLabel: 'blog-post-source-label',
      sourceUrl: 'blog-post-source-url',
      content: 'blog-post-content',
      published: 'blog-post-published',
      featured: null
    },
    saveAction: 'save-blog-post',
    cancelAction: 'cancel-blog-edit',
    editAction: 'edit-blog-post',
    toggleAction: 'toggle-blog-post',
    toggleFeaturedAction: null,
    deleteAction: 'delete-blog-post'
  }
});

let adminPostsCache = [];
const editingByType = { news: null, blog: null };
const pendingCoverFile = { news: null, blog: null };

function cfg(kind) {
  return POSTS_CONFIG[kind];
}

function el(id) {
  return id ? document.getElementById(id) : null;
}

function fieldValue(kind, key) {
  const id = cfg(kind).fields[key];
  const node = el(id);
  if (!node) return '';
  if (node.type === 'checkbox') return node.checked;
  return node.value;
}

function setFieldValue(kind, key, value) {
  const id = cfg(kind).fields[key];
  const node = el(id);
  if (!node) return;
  if (node.type === 'checkbox') node.checked = Boolean(value);
  else node.value = value ?? '';
}

export function initPostsAdmin(supabaseClient, { toast }) {
  window.__adminSupabase = supabaseClient;
  window.__adminPostsToast = toast;

  window.autoNewsSlug = () => autoSlug('news');
  window.autoBlogSlug = () => autoSlug('blog');
  window.previewNewsPostCover = () => previewPostCover('news');
  window.previewBlogPostCover = () => previewPostCover('blog');
  window.loadNewsPosts = () => loadPostsList('news');
  window.loadBlogPosts = () => loadPostsList('blog');
}

function autoSlug(kind) {
  const title = fieldValue(kind, 'title');
  setFieldValue(kind, 'slug', slugify(title));
}

function slugify(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function previewPostCover(kind) {
  const conf = cfg(kind);
  const box = el(conf.fields.coverPreview);
  if (!box) return;

  const pending = pendingCoverFile[kind];
  if (pending) {
    const objUrl = URL.createObjectURL(pending);
    box.innerHTML = `<img src="${escapeHtml(objUrl)}" alt="" loading="lazy">`;
    return;
  }

  const url = String(fieldValue(kind, 'coverHidden') || '').trim();
  const externalId = conf.fields.coverUrlFallback;
  const external = externalId ? String(el(externalId)?.value || '').trim() : '';
  const show = url || external;
  if (!show) {
    box.innerHTML =
      '<span class="text-muted-sm">Kapak görseli yüklendiğinde veya (blog) harici URL girildiğinde önizleme burada görünür.</span>';
    return;
  }
  box.innerHTML = `<img src="${escapeHtml(show)}" alt="" loading="lazy">`;
}

function bindCoverFileInput(kind) {
  const fileInput = el(cfg(kind).fields.coverFile);
  if (!fileInput || fileInput.dataset.bound === '1') return;
  fileInput.dataset.bound = '1';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    pendingCoverFile[kind] = file || null;
    previewPostCover(kind);
  });
}

export function resetPostForm(kind) {
  editingByType[kind] = null;
  pendingCoverFile[kind] = null;
  const conf = cfg(kind);
  const titleEl = el(conf.formTitleId);
  if (titleEl) {
    titleEl.textContent = kind === 'news' ? 'Yeni haber' : 'Yeni blog yazısı';
  }
  setFieldValue(kind, 'title', '');
  setFieldValue(kind, 'slug', '');
  setFieldValue(kind, 'excerpt', '');
  setFieldValue(kind, 'coverHidden', '');
  setFieldValue(kind, 'sourceLabel', '');
  setFieldValue(kind, 'sourceUrl', '');
  setFieldValue(kind, 'content', '');
  setFieldValue(kind, 'published', false);
  if (conf.fields.featured) setFieldValue(kind, 'featured', false);
  if (conf.fields.coverUrlFallback) el(conf.fields.coverUrlFallback).value = '';
  const fileInput = el(conf.fields.coverFile);
  if (fileInput) fileInput.value = '';
  const cancelBtn = document.querySelector(`[data-action="${conf.cancelAction}"]`);
  const saveBtn = document.querySelector(`[data-action="${conf.saveAction}"]`);
  if (cancelBtn) cancelBtn.hidden = true;
  if (saveBtn) saveBtn.textContent = 'Kaydet';
  previewPostCover(kind);
}

export function editPostById(kind, id) {
  const post = adminPostsCache.find(
    (p) => String(p.id) === String(id) && (p.content_type || 'news') === cfg(kind).contentType
  );
  const toast = window.__adminPostsToast;
  if (!post) {
    toast?.('Yazı bulunamadı', 'error');
    return;
  }
  editingByType[kind] = post.id;
  pendingCoverFile[kind] = null;
  const titleEl = el(cfg(kind).formTitleId);
  if (titleEl) titleEl.textContent = kind === 'news' ? 'Haber düzenle' : 'Blog yazısı düzenle';
  setFieldValue(kind, 'title', post.title);
  setFieldValue(kind, 'slug', post.slug);
  setFieldValue(kind, 'excerpt', post.excerpt);
  setFieldValue(kind, 'coverHidden', post.cover_image_url);
  setFieldValue(kind, 'sourceLabel', post.source_label);
  setFieldValue(kind, 'sourceUrl', post.source_url);
  setFieldValue(kind, 'content', post.content);
  setFieldValue(kind, 'category', post.category || 'auto');
  setFieldValue(kind, 'published', post.is_published);
  if (cfg(kind).fields.featured) setFieldValue(kind, 'featured', post.is_featured);
  if (cfg(kind).fields.coverUrlFallback) {
    const url = post.cover_image_url || '';
    const isExternal = url.startsWith('http') && !url.includes('/storage/v1/object/public/content-covers/');
    el(cfg(kind).fields.coverUrlFallback).value = isExternal ? url : '';
  }
  const fileInput = el(cfg(kind).fields.coverFile);
  if (fileInput) fileInput.value = '';
  document.querySelector(`[data-action="${cfg(kind).cancelAction}"]`).hidden = false;
  document.querySelector(`[data-action="${cfg(kind).saveAction}"]`).textContent = 'Güncelle';
  previewPostCover(kind);
  el(cfg(kind).editorCardId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast?.('Düzenleme modu');
}

export async function loadPostsList(kind) {
  bindCoverFileInput(kind);
  const conf = cfg(kind);
  const listEl = el(conf.listId);
  const filter = el(conf.filterId)?.value || '';
  const sb = window.__adminSupabase;

  let q = sb
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  // content_type separation: news vs blog
  q = q.eq('content_type', conf.contentType);
  if (filter) q = q.eq('category', filter);

  const { data, error } = await q;
  if (error) {
    listEl.innerHTML = `<p class="empty">Yüklenemedi: ${escapeHtml(error.message || String(error))}</p>`;
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  adminPostsCache = rows;

  if (!rows.length) {
    listEl.innerHTML = '<p class="empty">Henüz kayıt yok.</p>';
    return;
  }

  listEl.innerHTML =
    '<table class="table"><thead><tr><th>Görsel</th><th>Başlık</th><th>Kategori</th><th>Durum</th><th>Tarih</th><th></th></tr></thead><tbody>' +
    rows
      .map((p) => {
        const thumb = p.cover_image_url
          ? `<img src="${escapeHtml(p.cover_image_url)}" alt="" loading="lazy">`
          : '<span class="text-muted text-xs">—</span>';
        const featuredBadge =
          kind === 'news' && p.is_featured ? ' <span class="badge badge-blue">Ana sayfa</span>' : '';
        const actions = [
          `<button class="btn btn-ghost btn-sm" data-action="${conf.editAction}" data-id="${safeAttr(p.id)}">Düzenle</button>`,
          kind === 'news'
            ? `<button class="btn btn-ghost btn-sm" data-action="${conf.toggleFeaturedAction}" data-id="${safeAttr(p.id)}" data-active="${p.is_featured}">${p.is_featured ? 'Öne çıkandan al' : 'Ana sayfa'}</button>`
            : '',
          `<button class="btn btn-ghost btn-sm" data-action="${conf.toggleAction}" data-id="${safeAttr(p.id)}" data-active="${p.is_published}">${p.is_published ? 'Taslağa al' : 'Yayınla'}</button>`,
          `<button class="btn btn-danger btn-sm" data-action="${conf.deleteAction}" data-id="${safeAttr(p.id)}">Sil</button>`
        ]
          .filter(Boolean)
          .join('');
        return `<tr>
        <td class="ib-post-thumb-cell">${thumb}</td>
        <td><strong>${escapeHtml(p.title || '—')}</strong>${featuredBadge}</td>
        <td class="text-muted text-xs">${escapeHtml(p.category || 'auto')}</td>
        <td><span class="badge ${p.is_published ? 'badge-green' : 'badge-yellow'}">${p.is_published ? 'Yayında' : 'Taslak'}</span></td>
        <td class="text-muted cell-nowrap">${new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
        <td><div class="table-actions">${actions}</div></td></tr>`;
      })
      .join('') +
    '</tbody></table>';
}

async function resolveCoverUrl(kind) {
  const conf = cfg(kind);
  if (pendingCoverFile[kind]) {
    return uploadPostCoverImage(window.__adminSupabase, pendingCoverFile[kind], {
      folder: conf.contentType
    });
  }
  const hidden = String(fieldValue(kind, 'coverHidden') || '').trim();
  if (hidden) return hidden;
  if (conf.fields.coverUrlFallback) {
    const external = String(el(conf.fields.coverUrlFallback)?.value || '').trim();
    if (external) return external;
  }
  return null;
}

export async function savePost(kind) {
  const toast = window.__adminPostsToast;
  const conf = cfg(kind);
  const title = String(fieldValue(kind, 'title')).trim();
  const slug =
    String(fieldValue(kind, 'slug')).trim() || slugify(title);
  const content = String(fieldValue(kind, 'content')).trim();
  const excerpt = String(fieldValue(kind, 'excerpt')).trim();
  const category = fieldValue(kind, 'category') || 'auto';
  const source_label = String(fieldValue(kind, 'sourceLabel')).trim() || null;
  const source_url = String(fieldValue(kind, 'sourceUrl')).trim() || null;
  const is_published = Boolean(fieldValue(kind, 'published'));
  const is_featured = conf.fields.featured ? Boolean(fieldValue(kind, 'featured')) : false;

  if (!title) {
    toast?.('Başlık zorunlu', 'error');
    return;
  }

  if (kind === 'news' && !pendingCoverFile[kind] && !String(fieldValue(kind, 'coverHidden')).trim()) {
    toast?.('Kapak görseli yükleyin (dosya)', 'error');
    return;
  }

  let cover_image_url;
  try {
    cover_image_url = await resolveCoverUrl(kind);
  } catch (err) {
    toast?.(err instanceof Error ? err.message : 'Kapak yüklenemedi', 'error');
    return;
  }

  const values = {
    title,
    slug,
    content,
    excerpt,
    category,
    cover_image_url,
    source_label,
    source_url,
    is_published,
    is_featured,
    content_type: conf.contentType
  };

  if (editingByType[kind]) {
    const { error } = await window.__adminSupabase
      .from('posts')
      .update(values)
      .eq('id', editingByType[kind]);
    if (error) {
      toast?.(error.message || String(error), 'error');
      return;
    }
    toast?.(kind === 'news' ? 'Haber güncellendi' : 'Blog yazısı güncellendi');
  } else {
    const { error } = await window.__adminSupabase
      .from('posts')
      .insert(values);
    if (error) {
      toast?.(error.message || String(error), 'error');
      return;
    }
    toast?.(kind === 'news' ? 'Haber eklendi' : 'Blog yazısı eklendi');
  }
  resetPostForm(kind);
  loadPostsList(kind);
  if (typeof window.__adminReloadDashboard === 'function') window.__adminReloadDashboard();
}

export async function togglePost(kind, id, current) {
  const { error } = await window.__adminSupabase
    .from('posts')
    .update({ is_published: !current })
    .eq('id', id);
  if (error) {
    window.__adminPostsToast?.(error.message || String(error), 'error');
    return;
  }
  window.__adminPostsToast?.(current ? 'Taslağa alındı' : 'Yayınlandı');
  loadPostsList(kind);
  window.__adminReloadDashboard?.();
}

export async function togglePostFeatured(id, current) {
  const { error } = await window.__adminSupabase
    .from('posts')
    .update({ is_featured: !current })
    .eq('id', id);
  if (error) {
    window.__adminPostsToast?.(error.message || String(error), 'error');
    return;
  }
  window.__adminPostsToast?.(!current ? 'Ana sayfada gösterilecek' : 'Ana sayfadan kaldırıldı');
  loadPostsList('news');
}

export async function deletePost(kind, id) {
  if (!confirm('Silmek istediğinize emin misiniz?')) return;
  const { error } = await window.__adminSupabase
    .from('posts')
    .delete()
    .eq('id', id);
  if (error) {
    window.__adminPostsToast?.(error.message || String(error), 'error');
    return;
  }
  window.__adminPostsToast?.('Silindi');
  loadPostsList(kind);
  window.__adminReloadDashboard?.();
}

export function handlePostsAdminAction(action, id, isActive) {
  if (action === 'save-news-post') {
    savePost('news');
    return true;
  }
  if (action === 'save-blog-post') {
    savePost('blog');
    return true;
  }
  if (action === 'cancel-news-edit') {
    resetPostForm('news');
    return true;
  }
  if (action === 'cancel-blog-edit') {
    resetPostForm('blog');
    return true;
  }
  if (action === 'edit-news-post') {
    editPostById('news', id);
    return true;
  }
  if (action === 'edit-blog-post') {
    editPostById('blog', id);
    return true;
  }
  if (action === 'toggle-news-post') {
    togglePost('news', id, isActive);
    return true;
  }
  if (action === 'toggle-blog-post') {
    togglePost('blog', id, isActive);
    return true;
  }
  if (action === 'toggle-news-featured') {
    togglePostFeatured(id, isActive);
    return true;
  }
  if (action === 'delete-news-post') {
    deletePost('news', id);
    return true;
  }
  if (action === 'delete-blog-post') {
    deletePost('blog', id);
    return true;
  }
  return false;
}

export function loadNewsPostsAdmin() {
  bindCoverFileInput('news');
  bindCoverFileInput('blog');
  return loadPostsList('news');
}

export function loadBlogPostsAdmin() {
  bindCoverFileInput('blog');
  bindCoverFileInput('news');
  return loadPostsList('blog');
}
