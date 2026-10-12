import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Heart, MessageCircle, Send, Sparkles, Image as ImageIcon, X, AlertCircle } from 'lucide-react'
import { createPost, likePost, listPosts, replyToPost, uploadImage } from '@/lib/api'
import type { Post } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner, EmptyState } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'

const TYPES = [
  { value: 'general', label: 'General' },
  { value: 'event', label: 'Event' },
  { value: 'appreciation', label: 'Appreciation' },
]

// Matches the backend's 3MB cap (MAX_UPLOAD_BYTES in main.py) — checked
// here too so a too-big file never even gets uploaded.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024
const MAX_IMAGES_PER_POST = 4

export default function Community() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [type, setType] = useState('general')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  async function load() {
    setLoading(true)
    try {
      setPosts(await listPosts())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow selecting the same file again later
    if (!file) return
    setError('')
    if (images.length >= MAX_IMAGES_PER_POST) {
      setError(`Up to ${MAX_IMAGES_PER_POST} images per post`)
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image is too large — max 3MB')
      return
    }
    setUploading(true)
    try {
      const { image_url } = await uploadImage(file)
      setImages((prev) => [...prev, image_url])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload image')
    } finally {
      setUploading(false)
    }
  }

  async function handlePost(e: FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    try {
      const post = await createPost({ content, type, images: images.length ? images : undefined })
      setPosts((prev) => [post, ...prev])
      setContent('')
      setImages([])
    } finally {
      setPosting(false)
    }
  }

  async function handleLike(postId: string) {
    const { likes } = await likePost(postId)
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes } : p)))
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Community" subtitle="Events, appreciation, and neighborhood unity — in one feed." />

      <form onSubmit={handlePost} className="card p-5 mb-6">
        <textarea
          className="input"
          rows={3}
          placeholder="Share something with your neighbors..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3 mt-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {images.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover border border-midnight-100" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-midnight-900 text-white flex items-center justify-center"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || images.length >= MAX_IMAGES_PER_POST}
              className="btn-outline px-3"
              title="Attach an image"
            >
              {uploading ? <Spinner className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
            </button>
          </div>
          <button className="btn-primary" disabled={posting || uploading || !content.trim()}>
            {posting ? <Spinner className="h-4 w-4" /> : <>Post <Send className="h-3.5 w-3.5" /></>}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-16 text-royal"><Spinner className="h-6 w-6" /></div>
      ) : posts.length === 0 ? (
        <EmptyState title="No posts yet" subtitle="Be the first to say something nice." />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onLike={() => handleLike(post.id)} currentUserId={user?.id} onReply={load} />
          ))}
        </div>
      )}
    </div>
  )
}

// "Jane Doe · Flat 4B" for a resident, "Tunde · Guard" for staff — always
// leads with the name so the feed reads like neighbors talking, not a role
// log. Falls back to just the role if an older post has no name on record.
function authorLabel(name: string | undefined, role: string, apartment?: string | null) {
  const who = name || role.replace('_', ' ')
  // Residents often type "flat 6" themselves; don't turn that into "Flat flat 6".
  const unit = apartment ? (/^(flat|apt|apartment|house|block|unit|plot)\b/i.test(apartment.trim()) ? apartment.trim() : `Flat ${apartment.trim()}`) : ''
  const detail = role === 'resident' && unit ? unit.charAt(0).toUpperCase() + unit.slice(1) : role.replace('_', ' ')
  return { who, detail }
}

function PostCard({ post, onLike, onReply, currentUserId }: { post: Post; onLike: () => void; onReply: () => void; currentUserId?: string }) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const liked = currentUserId ? post.liked_by.includes(currentUserId) : false
  const author = authorLabel(post.author_name, post.author_role, post.author_apartment)

  async function handleReply(e: FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      await replyToPost(post.id, replyText)
      setReplyText('')
      setReplying(false)
      onReply()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-royal-50 text-royal font-display font-semibold text-xs flex items-center justify-center shrink-0">
            {author.who.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-midnight-900 leading-tight">{author.who}</p>
            <p className="text-xs text-midnight-400 capitalize leading-tight">{author.detail}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={post.type === 'appreciation' ? 'alert' : post.type === 'event' ? 'royal' : 'neutral'}>
            {post.type === 'appreciation' && <Sparkles className="h-3 w-3" />}
            {post.type}
          </Badge>
          <span className="text-xs text-midnight-400">{new Date(post.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <p className="text-sm text-midnight-800 leading-relaxed">{post.content}</p>

      {post.images && post.images.length > 0 && (
        <div className={`grid gap-2 mt-3 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.images.map((src, i) => (
            <img key={i} src={src} alt="" className="w-full max-h-80 object-cover rounded-xl border border-midnight-100" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 text-sm text-midnight-500">
        <button onClick={onLike} className={`flex items-center gap-1.5 hover:text-alert transition-colors ${liked ? 'text-alert' : ''}`}>
          <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /> {post.likes}
        </button>
        <button onClick={() => setReplying((r) => !r)} className="flex items-center gap-1.5 hover:text-royal transition-colors">
          <MessageCircle className="h-4 w-4" /> {post.replies.length}
        </button>
      </div>

      {post.replies.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-midnight-50 pt-4">
          {post.replies.map((r, i) => {
            const replyAuthor = authorLabel(r.author_name, r.author_role, r.author_apartment)
            return (
              <div key={i} className="text-sm bg-midnight-50/60 rounded-lg px-3 py-2">
                <span className="font-medium text-midnight-800">{replyAuthor.who}</span>
                <span className="text-midnight-400 text-xs capitalize"> · {replyAuthor.detail}</span>
                <p className="text-midnight-600 mt-0.5">{r.content}</p>
              </div>
            )
          })}
        </div>
      )}

      {replying && (
        <form onSubmit={handleReply} className="flex gap-2 mt-3">
          <input className="input flex-1" placeholder="Write a reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
          <button className="btn-outline" disabled={submitting}>{submitting ? <Spinner className="h-4 w-4" /> : 'Reply'}</button>
        </form>
      )}
    </div>
  )
}
