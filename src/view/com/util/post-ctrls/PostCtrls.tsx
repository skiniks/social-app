import React, {memo, useCallback} from 'react'
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import {
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AtUri,
  RichText as RichTextAPI,
} from '@atproto/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {HITSLOP_10, HITSLOP_20} from '#/lib/constants'
import {Haptics} from '#/lib/haptics'
import {CommentBottomArrow} from '#/lib/icons'
import {makeProfileLink} from '#/lib/routes/links'
import {shareUrl} from '#/lib/sharing'
import {pluralize} from '#/lib/strings/helpers'
import {toShareUrl} from '#/lib/strings/url-helpers'
import {s} from '#/lib/styles'
import {useTheme} from '#/lib/ThemeContext'
import {Shadow} from '#/state/cache/types'
import {useModalControls} from '#/state/modals'
import {
  usePostLikeMutationQueue,
  usePostRepostMutationQueue,
} from '#/state/queries/post'
import {useRequireAuth} from '#/state/session'
import {useComposerControls} from '#/state/shell/composer'
import {useDialogControl} from '#/components/Dialog'
import {ArrowOutOfBox_Stroke2_Corner0_Rounded as ArrowOutOfBox} from '#/components/icons/ArrowOutOfBox'
import {
  Heart2_Filled_Stroke2_Corner0_Rounded as HeartIconFilled,
  Heart2_Stroke2_Corner0_Rounded as HeartIconOutline,
} from '#/components/icons/Heart2'
import * as Prompt from '#/components/Prompt'
import {PostDropdownBtn} from '../forms/PostDropdownBtn'
import {Text} from '../text/Text'
import {RepostButton} from './RepostButton'

let PostCtrls = ({
  big,
  post,
  record,
  richText,
  style,
  onPressReply,
  logContext,
}: {
  big?: boolean
  post: Shadow<AppBskyFeedDefs.PostView>
  record: AppBskyFeedPost.Record
  richText: RichTextAPI
  style?: StyleProp<ViewStyle>
  onPressReply: () => void
  logContext: 'FeedItem' | 'PostThreadItem' | 'Post'
}): React.ReactNode => {
  const theme = useTheme()
  const {_} = useLingui()
  const {openComposer} = useComposerControls()
  const {closeModal} = useModalControls()
  const [queueLike, queueUnlike] = usePostLikeMutationQueue(post, logContext)
  const [queueRepost, queueUnrepost] = usePostRepostMutationQueue(
    post,
    logContext,
  )
  const requireAuth = useRequireAuth()
  const loggedOutWarningPromptControl = useDialogControl()

  const shouldShowLoggedOutWarning = React.useMemo(() => {
    return !!post.author.labels?.find(
      label => label.val === '!no-unauthenticated',
    )
  }, [post])

  const defaultCtrlColor = React.useMemo(
    () => ({
      color: theme.palette.default.postCtrl,
    }),
    [theme],
  ) as StyleProp<ViewStyle>

  const onPressToggleLike = React.useCallback(async () => {
    try {
      if (!post.viewer?.like) {
        Haptics.default()
        await queueLike()
      } else {
        await queueUnlike()
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        throw e
      }
    }
  }, [post.viewer?.like, queueLike, queueUnlike])

  const onRepost = useCallback(async () => {
    closeModal()
    try {
      if (!post.viewer?.repost) {
        Haptics.default()
        await queueRepost()
      } else {
        await queueUnrepost()
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        throw e
      }
    }
  }, [post.viewer?.repost, queueRepost, queueUnrepost, closeModal])

  const onQuote = useCallback(() => {
    closeModal()
    openComposer({
      quote: {
        uri: post.uri,
        cid: post.cid,
        text: record.text,
        author: post.author,
        indexedAt: post.indexedAt,
      },
    })
    Haptics.default()
  }, [
    post.uri,
    post.cid,
    post.author,
    post.indexedAt,
    record.text,
    openComposer,
    closeModal,
  ])

  const onShare = useCallback(() => {
    const urip = new AtUri(post.uri)
    const href = makeProfileLink(post.author, 'post', urip.rkey)
    const url = toShareUrl(href)
    shareUrl(url)
  }, [post.uri, post.author])

  return (
    <View style={[styles.ctrls, style]}>
      <View
        style={[
          big ? styles.ctrlBig : styles.ctrl,
          post.viewer?.replyDisabled ? {opacity: 0.5} : undefined,
        ]}>
        <TouchableOpacity
          testID="replyBtn"
          style={[styles.btn, !big && styles.btnPad, {paddingLeft: 0}]}
          onPress={() => {
            if (!post.viewer?.replyDisabled) {
              requireAuth(() => onPressReply())
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={`Reply (${post.replyCount} ${
            post.replyCount === 1 ? 'reply' : 'replies'
          })`}
          accessibilityHint=""
          hitSlop={big ? HITSLOP_20 : HITSLOP_10}>
          <CommentBottomArrow
            style={[defaultCtrlColor, big ? s.mt2 : styles.mt1]}
            strokeWidth={3}
            size={big ? 20 : 15}
          />
          {typeof post.replyCount !== 'undefined' && post.replyCount > 0 ? (
            <Text style={[defaultCtrlColor, s.ml5, s.f15]}>
              {post.replyCount}
            </Text>
          ) : undefined}
        </TouchableOpacity>
      </View>
      <View style={big ? styles.ctrlBig : styles.ctrl}>
        <RepostButton
          big={big}
          isReposted={!!post.viewer?.repost}
          repostCount={post.repostCount}
          onRepost={onRepost}
          onQuote={onQuote}
        />
      </View>
      <View style={big ? styles.ctrlBig : styles.ctrl}>
        <TouchableOpacity
          testID="likeBtn"
          style={[styles.btn, !big && styles.btnPad]}
          onPress={() => {
            requireAuth(() => onPressToggleLike())
          }}
          accessibilityRole="button"
          accessibilityLabel={`${
            post.viewer?.like ? _(msg`Unlike`) : _(msg`Like`)
          } (${post.likeCount} ${pluralize(post.likeCount || 0, 'like')})`}
          accessibilityHint=""
          hitSlop={big ? HITSLOP_20 : HITSLOP_10}>
          {post.viewer?.like ? (
            <HeartIconFilled style={s.likeColor} size={big ? 'lg' : 'md'} />
          ) : (
            <HeartIconOutline
              style={[defaultCtrlColor, big ? styles.mt1 : undefined]}
              size={big ? 'lg' : 'md'}
            />
          )}
          {typeof post.likeCount !== 'undefined' && post.likeCount > 0 ? (
            <Text
              testID="likeCount"
              style={
                post.viewer?.like
                  ? [s.bold, s.likeColor, s.f15, s.ml5]
                  : [defaultCtrlColor, s.f15, s.ml5]
              }>
              {post.likeCount}
            </Text>
          ) : undefined}
        </TouchableOpacity>
      </View>
      {big && (
        <>
          <View style={styles.ctrlBig}>
            <TouchableOpacity
              testID="shareBtn"
              style={[styles.btn]}
              onPress={() => {
                if (shouldShowLoggedOutWarning) {
                  loggedOutWarningPromptControl.open()
                } else {
                  onShare()
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`${_(msg`Share`)}`}
              accessibilityHint=""
              hitSlop={big ? HITSLOP_20 : HITSLOP_10}>
              <ArrowOutOfBox
                style={[defaultCtrlColor, styles.mt1]}
                width={22}
              />
            </TouchableOpacity>
          </View>
          <Prompt.Basic
            control={loggedOutWarningPromptControl}
            title={_(msg`Note about sharing`)}
            description={_(
              msg`This post is only visible to logged-in users. It won't be visible to people who aren't logged in.`,
            )}
            onConfirm={onShare}
            confirmButtonCta={_(msg`Share anyway`)}
          />
        </>
      )}
      <View style={big ? styles.ctrlBig : styles.ctrl}>
        <PostDropdownBtn
          testID="postDropdownBtn"
          postAuthor={post.author}
          postCid={post.cid}
          postUri={post.uri}
          record={record}
          richText={richText}
          style={styles.btnPad}
          hitSlop={big ? HITSLOP_20 : HITSLOP_10}
        />
      </View>
    </View>
  )
}
PostCtrls = memo(PostCtrls)
export {PostCtrls}

const styles = StyleSheet.create({
  ctrls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctrl: {
    flex: 1,
    alignItems: 'flex-start',
  },
  ctrlBig: {
    alignItems: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnPad: {
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 5,
    paddingRight: 5,
  },
  mt1: {
    marginTop: 1,
  },
})
