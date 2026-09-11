import { supabase } from '../supabaseClient.js'

// ---------- books ----------

export async function listBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('*, chapters(count)')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data.map((b) => ({ ...b, chapterCount: b.chapters?.[0]?.count ?? 0 }))
}

export async function getBook(bookId) {
  const { data, error } = await supabase.from('books').select('*').eq('id', bookId).single()
  if (error) throw error
  return data
}

export async function createBook({ title, description }) {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('books')
    .insert({ title, description: description || '', user_id: userData.user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBook(bookId, fields) {
  const { data, error } = await supabase.from('books').update(fields).eq('id', bookId).select().single()
  if (error) throw error
  return data
}

export async function deleteBook(bookId) {
  const { error } = await supabase.from('books').delete().eq('id', bookId)
  if (error) throw error
}

// ---------- chapters ----------

export async function listChapters(bookId) {
  const { data, error } = await supabase
    .from('chapters')
    .select('*, chapter_tags(tags(id, name))')
    .eq('book_id', bookId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(normalizeChapter)
}

export async function getChapter(chapterId) {
  const { data, error } = await supabase
    .from('chapters')
    .select('*, chapter_tags(tags(id, name))')
    .eq('id', chapterId)
    .single()
  if (error) throw error
  return normalizeChapter(data)
}

function normalizeChapter(row) {
  const tags = (row.chapter_tags || []).map((ct) => ct.tags).filter(Boolean)
  const { chapter_tags, ...rest } = row
  return { ...rest, tags }
}

export async function createChapter({ bookId, title, body }) {
  const { data: userData } = await supabase.auth.getUser()
  const { count } = await supabase
    .from('chapters')
    .select('id', { count: 'exact', head: true })
    .eq('book_id', bookId)
  const { data, error } = await supabase
    .from('chapters')
    .insert({
      book_id: bookId,
      title: title || 'Untitled chapter',
      body: body || '',
      order_index: count || 0,
      user_id: userData.user.id,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateChapter(chapterId, fields) {
  const { data, error } = await supabase.from('chapters').update(fields).eq('id', chapterId).select().single()
  if (error) throw error
  return data
}

export async function deleteChapter(chapterId) {
  const { error } = await supabase.from('chapters').delete().eq('id', chapterId)
  if (error) throw error
}

export async function reorderChapters(bookId, orderedIds) {
  await Promise.all(
    orderedIds.map((id, index) => supabase.from('chapters').update({ order_index: index }).eq('id', id)),
  )
}

// ---------- tags ----------

export async function listTags() {
  const { data, error } = await supabase.from('tags').select('*').order('name', { ascending: true })
  if (error) throw error
  return data
}

async function getOrCreateTag(name) {
  const clean = name.trim().toLowerCase().replace(/^#/, '')
  if (!clean) return null
  const { data: userData } = await supabase.auth.getUser()
  const { data: existing } = await supabase
    .from('tags')
    .select('*')
    .eq('name', clean)
    .maybeSingle()
  if (existing) return existing
  const { data, error } = await supabase
    .from('tags')
    .insert({ name: clean, user_id: userData.user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setChapterTags(chapterId, tagNames) {
  const { data: userData } = await supabase.auth.getUser()
  const uniqueNames = [...new Set(tagNames.map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean))]
  const tags = await Promise.all(uniqueNames.map(getOrCreateTag))

  await supabase.from('chapter_tags').delete().eq('chapter_id', chapterId)
  if (tags.length) {
    const rows = tags.map((tag) => ({ chapter_id: chapterId, tag_id: tag.id, user_id: userData.user.id }))
    const { error } = await supabase.from('chapter_tags').insert(rows)
    if (error) throw error
  }
  return tags
}

export async function listChaptersByTag(tagName) {
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id')
    .eq('name', tagName.toLowerCase())
    .maybeSingle()
  if (tagError) throw tagError
  if (!tag) return []

  const { data, error } = await supabase
    .from('chapter_tags')
    .select('chapters(*, book:books(id, title), chapter_tags(tags(id, name)))')
    .eq('tag_id', tag.id)
  if (error) throw error
  return data
    .filter((row) => row.chapters)
    .map((row) => ({ ...normalizeChapter(row.chapters), book: row.chapters.book }))
}

// ---------- version history ----------

export async function listVersions(chapterId) {
  const { data, error } = await supabase
    .from('chapter_versions')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function saveVersionSnapshot(chapterId, { title, body }) {
  const { data: userData } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('chapter_versions')
    .insert({ chapter_id: chapterId, title, body, user_id: userData.user.id })
  if (error) throw error
}

export async function deleteVersion(versionId) {
  const { error } = await supabase.from('chapter_versions').delete().eq('id', versionId)
  if (error) throw error
}

// ---------- full data export (used by backups) ----------

export async function exportAllData() {
  const [{ data: books }, { data: chapters }, { data: tags }, { data: chapterTags }] = await Promise.all([
    supabase.from('books').select('*'),
    supabase.from('chapters').select('*'),
    supabase.from('tags').select('*'),
    supabase.from('chapter_tags').select('*'),
  ])
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    books: books || [],
    chapters: chapters || [],
    tags: tags || [],
    chapterTags: chapterTags || [],
  }
}
