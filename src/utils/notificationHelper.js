// utils/notificationHelper.js
import { supabase } from '@/supabase'

/**
 * Create a notification with settings check
 * @param {Object} params - Notification parameters
 * @param {string} params.recipientId - User ID to receive notification
 * @param {string} params.actorId - User ID who triggered the notification
 * @param {string} params.type - Notification type (like, post_comment, follow, etc.)
 * @param {string} params.postId - Optional post ID
 * @param {string} params.commentId - Optional comment ID
 */
export async function createNotification({ recipientId, actorId, type, postId = null, commentId = null }) {
  try {
    // Don't notify if actor is the same as recipient
    if (recipientId === actorId) {
      return
    }

    // Check if actor is blocked by recipient
    const { data: isBlocked } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', recipientId)
      .eq('blocked_id', actorId)
      .maybeSingle()

    if (isBlocked) {
      console.log('User is blocked, not creating notification')
      return
    }

    // Get recipient's notification settings
    const { data: { user } } = await supabase.auth.admin.getUserById(recipientId)
    const settings = user?.user_metadata?.notification_settings || {
      likes: true,
      comments: true,
      followers: true,
      email: false
    }

    // Check if notification type is enabled
    let shouldCreate = true

    if (type === 'like' || type === 'comment_like' || type === 'like_milestone') {
      shouldCreate = settings.likes
    } else if (type === 'post_comment' || type === 'comment_reply') {
      shouldCreate = settings.comments
    } else if (type === 'follow' || type === 'friend_request' || type === 'friend_accept') {
      shouldCreate = settings.followers
    }

    if (!shouldCreate) {
      console.log(`Notification type '${type}' is disabled for user`)
      return
    }

    // Create the notification
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: recipientId,
        actor_id: actorId,
        type: type,
        post_id: postId,
        comment_id: commentId,
        is_read: false,
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error

    console.log('Notification created:', data)
    return data

  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Example usage in your like/comment/follow functions:
 * 
 * // When someone likes a post:
 * await createNotification({
 *   recipientId: post.user_id,
 *   actorId: currentUser.id,
 *   type: 'like',
 *   postId: post.id
 * })
 * 
 * // When someone comments:
 * await createNotification({
 *   recipientId: post.user_id,
 *   actorId: currentUser.id,
 *   type: 'post_comment',
 *   postId: post.id,
 *   commentId: comment.id
 * })
 * 
 * // When someone follows:
 * await createNotification({
 *   recipientId: userToFollow.id,
 *   actorId: currentUser.id,
 *   type: 'follow'
 * })
 */