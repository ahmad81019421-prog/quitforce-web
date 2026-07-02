import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Heart, MessageCircle, Trophy } from 'lucide-react'
import PremiumGlassCard from '../components/PremiumGlassCard'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../lib/AuthContext'
import { watchPosts, createPost, toggleLike } from '../lib/firestore'

export default function CommunityPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [draft, setDraft] = useState('')
  const [posts, setPosts] = useState([])
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    const unsub = watchPosts(setPosts)
    return unsub
  }, [])

  async function handlePost() {
    if (!draft.trim() || !user || posting) return
    setPosting(true)
    try {
      await createPost(user.uid, user.displayName || user.email || 'Anonymous', draft.trim())
      setDraft('')
    } catch (err) {
      console.error('Failed to post:', err)
    } finally {
      setPosting(false)
    }
  }

  async function handleLike(post) {
    if (!user) return
    const liked = (post.likedBy || []).includes(user.uid)
    try {
      await toggleLike(post.id, user.uid, liked)
    } catch (err) {
      console.error('Failed to toggle like:', err)
    }
  }

  return (
    <div className="min-h-screen w-full bg-black pb-28">
      <div className="px-6 pt-6 max-w-2xl mx-auto space-y-5">
        <h1 className="font-display text-2xl font-semibold text-white">{t('community.title')}</h1>

        <PremiumGlassCard padding="p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('community.placeholder')}
            rows={2}
            className="w-full bg-transparent text-white text-sm placeholder:text-white/30 outline-none resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              disabled={!draft.trim() || posting}
              onClick={handlePost}
              className="rounded-full bg-white text-black text-xs font-semibold px-4 py-1.5 disabled:opacity-30"
            >
              {posting ? '…' : t('community.post')}
            </button>
          </div>
        </PremiumGlassCard>

        {posts.length === 0 && (
          <p className="text-white/30 text-sm text-center py-8">—</p>
        )}

        {posts.map((p, i) => {
          const liked = user ? (p.likedBy || []).includes(user.uid) : false
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <PremiumGlassCard padding="p-4" interactive>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-white/10" />
                  <div>
                    <p className="text-white text-sm font-medium">{p.name}</p>
                    {p.achievement && (
                      <p className="text-white/40 text-xs flex items-center gap-1">
                        <Trophy size={11} /> {p.achievement}
                      </p>
                    )}
                  </div>
                </div>
                {p.text && <p className="text-white/80 text-sm mb-3">{p.text}</p>}
                <div className="flex items-center gap-5 text-white/50 text-xs">
                  <button onClick={() => handleLike(p)} className="flex items-center gap-1">
                    <Heart size={14} fill={liked ? '#FF3B30' : 'none'} color={liked ? '#FF3B30' : 'currentColor'} />
                    {(p.likedBy || []).length} {t('community.likes')}
                  </button>
                  <span className="flex items-center gap-1"><MessageCircle size={14} /> {p.commentsCount || 0} {t('community.comments')}</span>
                </div>
              </PremiumGlassCard>
            </motion.div>
          )
        })}
      </div>
      <BottomNav />
    </div>
  )
}
