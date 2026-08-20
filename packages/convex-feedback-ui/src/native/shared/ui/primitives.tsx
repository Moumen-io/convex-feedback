import type {
  FeedbackComment,
  FeedbackEntry as FeedbackEntryData,
} from "convex-feedback";
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import {
  FeedbackNativeThemeScope,
  useFeedbackUi,
} from "../../../shared/context/FeedbackProvider.js";
import type {
  BoardSearchBaseProps,
  BoardSearchState,
  CommentActionBaseProps,
  CommentLikeBaseProps,
  CommentLikeState,
  CommentRootBaseProps,
  EntryRootBaseProps,
  EntryUpvoteBaseProps,
  EntryUpvoteState,
  FeedbackColorProps,
  FormSubmitBaseProps,
  FormSubmitState,
  RepliesButtonBaseProps,
} from "../../../shared/types";
import { combineStyle } from "../helpers.js";

/**
 * Props for `FeedbackBoard.Root`.
 */
export type BoardRootProps = PropsWithChildren<FeedbackColorProps>;

function BoardRoot({
  primaryColor,
  backgroundColor,
  surfaceColor,
  textColor,
  mutedColor,
  borderColor,
  dangerColor,
  children,
}: BoardRootProps) {
  const colorOverrides = useMemo(
    () => ({
      ...(primaryColor === undefined ? {} : { primary: primaryColor }),
      ...(backgroundColor === undefined ? {} : { background: backgroundColor }),
      ...(surfaceColor === undefined ? {} : { surface: surfaceColor }),
      ...(textColor === undefined ? {} : { text: textColor }),
      ...(mutedColor === undefined ? {} : { mutedText: mutedColor }),
      ...(borderColor === undefined ? {} : { border: borderColor }),
      ...(dangerColor === undefined ? {} : { danger: dangerColor }),
    }),
    [
      backgroundColor,
      borderColor,
      dangerColor,
      mutedColor,
      primaryColor,
      surfaceColor,
      textColor,
    ],
  );

  return (
    <FeedbackNativeThemeScope colors={colorOverrides}>
      {children}
    </FeedbackNativeThemeScope>
  );
}

function BoardHeader({ style, ...props }: ViewProps) {
  const { theme, unstyled } = useFeedbackUi();
  return (
    <View
      {...props}
      style={combineStyle<ViewStyle>(
        !unstyled,
        { gap: theme.spacing, backgroundColor: theme.colors.background },
        style,
      )}
    />
  );
}

function BoardTitle({ style, children, ...props }: TextProps) {
  const { messages, theme, unstyled } = useFeedbackUi();
  return (
    <Text
      {...props}
      style={combineStyle<TextStyle>(
        !unstyled,
        { color: theme.colors.text, fontSize: 24, fontWeight: "700" },
        style,
      )}
    >
      {children ?? messages.board.title}
    </Text>
  );
}

/**
 * Props for native `FeedbackBoard.Search`.
 */
export interface BoardSearchProps
  extends
    Omit<TextInputProps, "children" | "value" | "onChangeText">,
    BoardSearchBaseProps {}

const BoardSearch = forwardRef<TextInput, BoardSearchProps>(
  ({ value, onValueChange, children, style, ...props }, ref) => {
    const { messages, theme, unstyled } = useFeedbackUi();
    const state: BoardSearchState = { value, setValue: onValueChange };
    if (typeof children === "function") return <>{children(state)}</>;
    return (
      <TextInput
        ref={ref}
        {...props}
        value={value}
        onChangeText={onValueChange}
        placeholder={props.placeholder ?? messages.board.searchPlaceholder}
        placeholderTextColor={
          props.placeholderTextColor ?? theme.colors.mutedText
        }
        style={combineStyle<TextStyle>(
          !unstyled,
          {
            color: theme.colors.text,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: Math.max(8, theme.radius - 2),
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: theme.colors.surface,
          },
          style,
        )}
      />
    );
  },
);
// change to forwardRef

const BoardList = forwardRef<ScrollView, ScrollViewProps>(
  ({ style, ...props }, ref) => {
    const { theme, unstyled } = useFeedbackUi();
    return (
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        style={{ flex: 1 }}
        {...props}
        contentContainerStyle={combineStyle<ViewStyle>(
          !unstyled,
          { gap: Math.max(8, theme.spacing - 2) },
          style,
        )}
      />
    );
  },
);

export const FeedbackBoard = {
  Root: BoardRoot,
  Header: BoardHeader,
  Title: BoardTitle,
  Search: BoardSearch,
  List: BoardList,
};

const EntryContext = createContext<FeedbackEntryData | null>(null);
function useEntryContext(): FeedbackEntryData {
  const value = useContext(EntryContext);
  if (value === null)
    throw new Error(
      "FeedbackEntry compound must be inside FeedbackEntry.Root.",
    );
  return value;
}

/**
 * Props for native `FeedbackEntry.Root`.
 */
export interface EntryRootProps extends ViewProps, EntryRootBaseProps {}

function EntryRoot({ entry, style, ...props }: EntryRootProps) {
  const { theme, unstyled } = useFeedbackUi();
  return (
    <EntryContext.Provider value={entry}>
      <View
        {...props}
        style={combineStyle<ViewStyle>(
          !unstyled,
          {
            flexDirection: "row",
            gap: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius,
            backgroundColor: theme.colors.surface,
          },
          style,
        )}
      />
    </EntryContext.Provider>
  );
}

export interface EntryUpvoteProps
  extends
    Omit<PressableProps, "children" | "onPress" | "style">,
    EntryUpvoteBaseProps {
  primaryColor?: string;
  style?: StyleProp<ViewStyle>;
}

function EntryUpvote({
  onToggle,
  children,
  primaryColor,
  style,
  accessibilityLabel,
  ...props
}: EntryUpvoteProps) {
  const entry = useEntryContext();
  const { theme, unstyled, messages } = useFeedbackUi();
  const activeColor = primaryColor ?? theme.colors.primary;
  const toggle = () => onToggle(!entry.viewerHasUpvoted);
  const state: EntryUpvoteState = {
    entry,
    active: entry.viewerHasUpvoted,
    count: entry.upvoteCount,
    toggle,
  };
  if (typeof children === "function") return <>{children(state)}</>;
  return (
    <Pressable
      {...props}
      accessibilityLabel={
        accessibilityLabel ??
        (entry.viewerHasUpvoted
          ? messages.entry.removeUpvote
          : messages.entry.upvote)
      }
      onPress={toggle}
      style={combineStyle<ViewStyle>(
        !unstyled,
        {
          width: 48,
          minHeight: 54,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: entry.viewerHasUpvoted
            ? activeColor
            : theme.colors.border,
          borderRadius: 10,
          backgroundColor: theme.colors.surfaceMuted,
        },
        style,
      )}
    >
      {children ?? (
        <>
          <Text
            style={{
              color: entry.viewerHasUpvoted
                ? activeColor
                : theme.colors.mutedText,
            }}
          >
            ▲
          </Text>
          <Text
            style={{
              color: entry.viewerHasUpvoted ? activeColor : theme.colors.text,
              fontWeight: "700",
            }}
          >
            {entry.upvoteCount}
          </Text>
        </>
      )}
    </Pressable>
  );
}
function EntryKind({ style, children, ...props }: TextProps) {
  const entry = useEntryContext();
  const { messages, theme, unstyled } = useFeedbackUi();

  return (
    <Text
      {...props}
      style={combineStyle<TextStyle>(
        !unstyled,
        {
          color: theme.colors.mutedText,
          fontSize: 12,
          fontWeight: "600",
        },
        style,
      )}
    >
      {children ?? messages.kinds[entry.kind]}
    </Text>
  );
}
function EntryContent({ style, ...props }: ViewProps) {
  return <View {...props} style={[{ flex: 1, minWidth: 0 }, style]} />;
}
function EntryTitle({ style, children, ...props }: TextProps) {
  const entry = useEntryContext();
  const { theme, unstyled } = useFeedbackUi();
  return (
    <Text
      {...props}
      style={combineStyle<TextStyle>(
        !unstyled,
        { color: theme.colors.text, fontWeight: "700", fontSize: 16 },
        style,
      )}
    >
      {children ?? entry.title}
    </Text>
  );
}
function EntryBody({ style, children, ...props }: TextProps) {
  const entry = useEntryContext();
  const { theme, unstyled } = useFeedbackUi();
  return (
    <Text
      {...props}
      style={combineStyle<TextStyle>(
        !unstyled,
        { color: theme.colors.mutedText, lineHeight: 20 },
        style,
      )}
    >
      {children ?? entry.body}
    </Text>
  );
}
function EntryStatus({ style, children, ...props }: TextProps) {
  const entry = useEntryContext();
  const { messages, theme, unstyled } = useFeedbackUi();
  return (
    <Text
      {...props}
      style={combineStyle<TextStyle>(
        !unstyled,
        { color: theme.colors.mutedText, fontSize: 12, fontWeight: "600" },
        style,
      )}
    >
      {children ?? messages.statuses[entry.status]}
    </Text>
  );
}
function EntryCommentCount({ style, children, ...props }: TextProps) {
  const entry = useEntryContext();
  const { messages, theme, unstyled } = useFeedbackUi();
  return (
    <Text
      {...props}
      style={combineStyle<TextStyle>(
        !unstyled,
        { color: theme.colors.mutedText, fontSize: 12 },
        style,
      )}
    >
      {children ?? messages.entry.comments(entry.commentCount)}
    </Text>
  );
}
export const FeedbackEntry = {
  Root: EntryRoot,
  Upvote: EntryUpvote,
  Content: EntryContent,
  Kind: EntryKind,
  Title: EntryTitle,
  Body: EntryBody,
  Status: EntryStatus,
  CommentCount: EntryCommentCount,
};

const CommentContext = createContext<FeedbackComment | null>(null);
function useCommentContext(): FeedbackComment {
  const value = useContext(CommentContext);
  if (value === null)
    throw new Error("Comment compound must be inside Comment.Root.");
  return value;
}
export interface CommentRootProps extends ViewProps, CommentRootBaseProps {}

function CommentRoot({ comment, style, ...props }: CommentRootProps) {
  const { theme, unstyled } = useFeedbackUi();
  return (
    <CommentContext.Provider value={comment}>
      <View
        {...props}
        style={combineStyle<ViewStyle>(
          !unstyled,
          {
            gap: 7,
            padding: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: Math.max(8, theme.radius - 2),
            backgroundColor: theme.colors.surface,
          },
          style,
        )}
      />
    </CommentContext.Provider>
  );
}
function CommentBody({ style, children, ...props }: TextProps) {
  const comment = useCommentContext();
  const { messages, theme, unstyled } = useFeedbackUi();
  return (
    <Text
      {...props}
      style={combineStyle<TextStyle>(
        !unstyled,
        {
          color:
            comment.body === null ? theme.colors.mutedText : theme.colors.text,
          lineHeight: 20,
        },
        style,
      )}
    >
      {children ?? comment.body ?? messages.comments.deleted}
    </Text>
  );
}

export interface CommentLikeProps
  extends
    Omit<PressableProps, "children" | "onPress" | "style">,
    CommentLikeBaseProps {
  primaryColor?: string;
  style?: StyleProp<ViewStyle>;
}
function CommentLike({
  onToggle,
  children,
  primaryColor,
  style,
  accessibilityLabel,
  ...props
}: CommentLikeProps) {
  const comment = useCommentContext();
  const { theme, unstyled, messages } = useFeedbackUi();
  const color = primaryColor ?? theme.colors.primary;
  const toggle = () => onToggle(!comment.viewerHasLiked);
  const state: CommentLikeState = {
    comment,
    active: comment.viewerHasLiked,
    count: comment.likeCount,
    toggle,
  };
  if (typeof children === "function") return <>{children(state)}</>;
  return (
    <Pressable
      {...props}
      accessibilityLabel={
        accessibilityLabel ??
        props["aria-label"] ??
        (comment.viewerHasLiked
          ? messages.comments.unlike
          : messages.comments.like)
      }
      onPress={toggle}
      style={combineStyle<ViewStyle>(
        !unstyled,
        {
          flexDirection: "row",
          gap: 4,
          alignItems: "center",
          paddingVertical: 4,
          paddingHorizontal: 5,
        },
        style,
      )}
    >
      {children ?? (
        <>
          <Text
            style={{
              color: comment.viewerHasLiked ? color : theme.colors.mutedText,
            }}
          >
            {comment.viewerHasLiked ? "♥" : "♡"}
          </Text>
          <Text
            style={{
              color: comment.viewerHasLiked ? color : theme.colors.mutedText,
              fontSize: 12,
            }}
          >
            {comment.likeCount}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export interface CommentActionProps
  extends
    Omit<PressableProps, "children" | "onPress" | "style">,
    CommentActionBaseProps {
  style?: StyleProp<ViewStyle>;
}
function CommentReply({
  onActivate,
  children,
  style,
  ...props
}: CommentActionProps) {
  const comment = useCommentContext();
  const { messages, theme, unstyled } = useFeedbackUi();
  const state = { comment, activate: onActivate };
  if (typeof children === "function") return <>{children(state)}</>;
  return (
    <Pressable
      {...props}
      onPress={onActivate}
      style={combineStyle<ViewStyle>(!unstyled, { padding: 5 }, style)}
    >
      <Text style={{ color: theme.colors.mutedText, fontSize: 12 }}>
        {children ?? messages.comments.reply}
      </Text>
    </Pressable>
  );
}

export interface RepliesButtonProps
  extends
    Omit<PressableProps, "children" | "onPress" | "style">,
    RepliesButtonBaseProps {
  style?: StyleProp<ViewStyle>;
}
function CommentRepliesButton({
  expanded,
  onExpandedChange,
  children,
  style,
  ...props
}: RepliesButtonProps) {
  const comment = useCommentContext();
  const { messages, theme, unstyled } = useFeedbackUi();
  const activate = () => onExpandedChange(!expanded);
  const state = { comment, expanded, count: comment.replyCount, activate };
  if (typeof children === "function") return <>{children(state)}</>;
  if (comment.replyCount === 0) return null;
  return (
    <Pressable
      {...props}
      onPress={activate}
      style={combineStyle<ViewStyle>(!unstyled, { padding: 5 }, style)}
    >
      <Text
        style={{ color: theme.colors.primary, fontSize: 12, fontWeight: "600" }}
      >
        {children ??
          (expanded
            ? messages.comments.hideReplies
            : messages.comments.viewReplies(comment.replyCount))}
      </Text>
    </Pressable>
  );
}
function CommentChildren({ style, ...props }: ViewProps) {
  const { theme, unstyled } = useFeedbackUi();
  return (
    <View
      {...props}
      style={combineStyle<ViewStyle>(
        !unstyled,
        {
          gap: 8,
          marginLeft: 14,
          paddingLeft: 10,
          borderLeftWidth: 2,
          borderLeftColor: theme.colors.border,
        },
        style,
      )}
    />
  );
}
export const Comment = {
  Root: CommentRoot,
  Body: CommentBody,
  Like: CommentLike,
  Reply: CommentReply,
  RepliesButton: CommentRepliesButton,
  Children: CommentChildren,
};

function FormRoot({ style, ...props }: ViewProps) {
  const { unstyled } = useFeedbackUi();
  return (
    <View
      {...props}
      style={combineStyle<ViewStyle>(!unstyled, { gap: 9 }, style)}
    />
  );
}
function FormInput({ style, ...props }: TextInputProps) {
  const { theme, unstyled } = useFeedbackUi();
  return (
    <TextInput
      {...props}
      placeholderTextColor={
        props.placeholderTextColor ?? theme.colors.mutedText
      }
      style={combineStyle<TextStyle>(
        !unstyled,
        {
          color: theme.colors.text,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: Math.max(8, theme.radius - 2),
          paddingHorizontal: 11,
          paddingVertical: 9,
          backgroundColor: theme.colors.surface,
        },
        style,
      )}
    />
  );
}
function FormTextarea({ style, ...props }: TextInputProps) {
  return (
    <FormInput
      {...props}
      multiline
      textAlignVertical={props.textAlignVertical ?? "top"}
      style={[{ minHeight: 90 }, style]}
    />
  );
}

export interface FormSubmitProps
  extends Omit<PressableProps, "children" | "style">, FormSubmitBaseProps {
  backgroundColor?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}
function FormSubmit({
  submitting = false,
  children,
  backgroundColor,
  color,
  disabled,
  style,
  ...props
}: FormSubmitProps) {
  const { messages, theme, unstyled } = useFeedbackUi();
  const state: FormSubmitState = { submitting };
  if (typeof children === "function") return <>{children(state)}</>;
  return (
    <Pressable
      {...props}
      disabled={disabled ?? submitting}
      style={combineStyle<ViewStyle>(
        !unstyled,
        {
          minHeight: 42,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: Math.max(8, theme.radius - 2),
          paddingHorizontal: 12,
          backgroundColor: backgroundColor ?? theme.colors.primary,
          opacity: (disabled ?? submitting) ? 0.55 : 1,
        },
        style,
      )}
    >
      <Text
        style={{
          color: color ?? theme.colors.primaryForeground,
          fontWeight: "700",
        }}
      >
        {children ?? messages.form.submit}
      </Text>
    </Pressable>
  );
}
export const FeedbackForm = {
  Root: FormRoot,
  Input: FormInput,
  Textarea: FormTextarea,
  Submit: FormSubmit,
};
