import React, {useImperativeHandle} from 'react'
import {Dimensions, Pressable, View} from 'react-native'
import Animated, {useAnimatedStyle} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import BottomSheet, {
  BottomSheetBackdropProps,
  BottomSheetScrollView,
  BottomSheetScrollViewMethods,
  BottomSheetTextInput,
  BottomSheetView,
  useBottomSheet,
  WINDOW_HEIGHT,
} from '@discord/bottom-sheet/src'

import {useDialogStateControlContext} from '#/state/dialogs'
import {isNative} from 'platform/detection'
import {atoms as a, flatten, useTheme} from '#/alf'
import {Context} from '#/components/Dialog/context'
import {
  DialogControlProps,
  DialogInnerProps,
  DialogOuterProps,
} from '#/components/Dialog/types'
import {createInput} from '#/components/forms/TextField'
import {Portal} from '#/components/Portal'

export {useDialogContext, useDialogControl} from '#/components/Dialog/context'
export * from '#/components/Dialog/types'
// @ts-ignore
export const Input = createInput(BottomSheetTextInput)

function Backdrop(props: BottomSheetBackdropProps) {
  const t = useTheme()
  const bottomSheet = useBottomSheet()

  const animatedStyle = useAnimatedStyle(() => {
    const opacity =
      (Math.abs(WINDOW_HEIGHT - props.animatedPosition.value) - 50) / 1000

    return {
      opacity: Math.min(Math.max(opacity, 0), 0.55),
    }
  })

  const onPress = React.useCallback(() => {
    bottomSheet.close()
  }, [bottomSheet])

  return (
    <Animated.View
      style={[
        t.atoms.bg_contrast_300,
        {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          position: 'absolute',
        },
        animatedStyle,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dialog backdrop"
        accessibilityHint="Press the backdrop to close the dialog"
        style={{flex: 1}}
        onPress={onPress}
      />
    </Animated.View>
  )
}

export function Outer({
  children,
  control,
  onClose,
  nativeOptions,
  testID,
}: React.PropsWithChildren<DialogOuterProps>) {
  const t = useTheme()
  const sheet = React.useRef<BottomSheet>(null)
  const sheetOptions = nativeOptions?.sheet || {}
  const hasSnapPoints = !!sheetOptions.snapPoints
  const insets = useSafeAreaInsets()
  const isClosing = React.useRef<boolean>(false)
  const closeCallbacks = React.useRef<(() => void)[]>([])
  const {setDialogIsOpen} = useDialogStateControlContext()

  /*
   * Used to manage open/closed, but index is otherwise handled internally by `BottomSheet`
   */
  const [openIndex, setOpenIndex] = React.useState(-1)

  /*
   * `openIndex` is the index of the snap point to open the bottom sheet to. If >0, the bottom sheet is open.
   */
  const isOpen = openIndex > -1

  const open = React.useCallback<DialogControlProps['open']>(
    ({index} = {}) => {
      setDialogIsOpen(control.id, true)
      // can be set to any index of `snapPoints`, but `0` is the first i.e. "open"
      setOpenIndex(index || 0)
    },
    [setOpenIndex, setDialogIsOpen, control.id],
  )

  // This is the function that we call when we want to dismiss the dialog.
  const close = React.useCallback<DialogControlProps['close']>(cb => {
    if (typeof cb === 'function') {
      closeCallbacks.current?.push(cb)
      closeCallbacks.current?.push(cb)
    }

    if (!isClosing.current) {
      sheet.current?.close()
      isClosing.current = true
    }
  }, [])

  // This is the actual thing we are doing once we "confirm" the dialog. We want the dialog's close animation to
  // happen before we run this. It is passed to the `BottomSheet` component.
  const onCloseAnimationComplete = React.useCallback(() => {
    // This removes the dialog from our list of stored dialogs. Not super necessary on iOS, but on Android this
    // tells us that we need to toggle the accessibility overlay setting
    setDialogIsOpen(control.id, false)
    setOpenIndex(-1)

    if (closeCallbacks.current && closeCallbacks.current.length > 0) {
      for (const cb of closeCallbacks.current) {
        try {
          cb()
        } catch {}
      }
    }
    onClose?.()
  }, [control.id, onClose, setDialogIsOpen])

  useImperativeHandle(
    control.ref,
    () => ({
      open,
      close,
    }),
    [open, close],
  )

  const context = React.useMemo(() => ({close}), [close])

  return (
    isOpen && (
      <Portal>
        <View
          // iOS
          accessibilityViewIsModal
          // Android
          importantForAccessibility="yes"
          style={[a.absolute, a.inset_0]}
          testID={testID}>
          <BottomSheet
            enableDynamicSizing={!hasSnapPoints}
            enablePanDownToClose
            keyboardBehavior="interactive"
            android_keyboardInputMode="adjustResize"
            keyboardBlurBehavior="restore"
            topInset={insets.top}
            {...sheetOptions}
            snapPoints={sheetOptions.snapPoints || ['100%']}
            ref={sheet}
            index={openIndex}
            backgroundStyle={{backgroundColor: 'transparent'}}
            backdropComponent={Backdrop}
            handleIndicatorStyle={{backgroundColor: t.palette.primary_500}}
            handleStyle={{display: 'none'}}
            onClose={onCloseAnimationComplete}>
            <Context.Provider value={context}>
              <View
                style={[
                  a.absolute,
                  a.inset_0,
                  t.atoms.bg,
                  {
                    borderTopLeftRadius: 40,
                    borderTopRightRadius: 40,
                    height: Dimensions.get('window').height * 2,
                  },
                ]}
              />
              {children}
            </Context.Provider>
          </BottomSheet>
        </View>
      </Portal>
    )
  )
}

export function Inner({children, style}: DialogInnerProps) {
  const insets = useSafeAreaInsets()
  return (
    <BottomSheetView
      style={[
        a.p_xl,
        {
          paddingTop: 40,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          paddingBottom: insets.bottom + a.pb_5xl.paddingBottom,
        },
        flatten(style),
      ]}>
      {children}
    </BottomSheetView>
  )
}

export const ScrollableInner = React.forwardRef<
  BottomSheetScrollViewMethods,
  DialogInnerProps
>(function ScrollableInner({children, style}, ref) {
  const insets = useSafeAreaInsets()
  return (
    <BottomSheetScrollView
      keyboardShouldPersistTaps="handled"
      style={[
        a.flex_1, // main diff is this
        a.p_xl,
        a.h_full,
        {
          paddingTop: 40,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        },
        flatten(style),
      ]}
      contentContainerStyle={isNative ? a.pb_4xl : undefined}
      ref={ref}>
      {children}
      <View style={{height: insets.bottom + a.pt_5xl.paddingTop}} />
    </BottomSheetScrollView>
  )
})

export function Handle() {
  const t = useTheme()

  return (
    <View style={[a.absolute, a.w_full, a.align_center, a.z_10, {height: 40}]}>
      <View
        style={[
          a.rounded_sm,
          {
            top: a.pt_lg.paddingTop,
            width: 35,
            height: 4,
            alignSelf: 'center',
            backgroundColor: t.palette.contrast_900,
            opacity: 0.5,
          },
        ]}
      />
    </View>
  )
}

export function Close() {
  return null
}
