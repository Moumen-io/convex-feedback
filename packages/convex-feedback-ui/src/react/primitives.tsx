"use client";

import type {
  FeedbackComment,
  FeedbackEntry as FeedbackEntryData,
} from "convex-feedback";
import {
  createContext,
  useContext,
  type ButtonHTMLAttributes,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import type {
  BoardRootBaseProps,
  BoardSearchBaseProps,
  BoardSearchState,
  CommentActionBaseProps,
  CommentActionState,
  CommentLikeBaseProps,
  CommentLikeState,
  CommentRootBaseProps,
  EntryRootBaseProps,
  EntryUpvoteBaseProps,
  EntryUpvoteState,
  FormSubmitBaseProps,
  FormSubmitState,
  RepliesButtonBaseProps,
  RepliesButtonState,
} from "../shared/types";
import { feedbackCssVariables, useFeedbackUi } from "./context.js";

function classes(
  unstyled: boolean,
  base: string,
  className?: string,
): string | undefined {
  if (unstyled) return className;
  return className === undefined ? base : `${base} ${className}`;
}

/**
 * Props for `FeedbackBoard.Root`.
 */
export interface BoardRootProps
  extends HTMLAttributes<HTMLDivElement>, BoardRootBaseProps {}

function BoardRoot({
  primaryColor,
  backgroundColor,
  surfaceColor,
  textColor,
  mutedColor,
  borderColor,
  dangerColor,
  unstyled: localUnstyled,
  className,
  style,
  ...props
}: BoardRootProps) {
  const ui = useFeedbackUi();
  const unstyled = localUnstyled ?? ui.unstyled;
  const variables = feedbackCssVariables(ui.theme, {
    ...(primaryColor === undefined ? {} : { primaryColor }),
    ...(backgroundColor === undefined ? {} : { backgroundColor }),
    ...(surfaceColor === undefined ? {} : { surfaceColor }),
    ...(textColor === undefined ? {} : { textColor }),
    ...(mutedColor === undefined ? {} : { mutedColor }),
    ...(borderColor === undefined ? {} : { borderColor }),
    ...(dangerColor === undefined ? {} : { dangerColor }),
  });
  return (
    <div
      {...props}
      className={classes(unstyled, "cf-board", className)}
      style={{ ...variables, ...style }}
    />
  );
}

function BoardHeader(props: HTMLAttributes<HTMLDivElement>) {
  const { unstyled } = useFeedbackUi();
  return (
    <div
      {...props}
      className={classes(unstyled, "cf-board__header", props.className)}
    />
  );
}

function BoardTitle(props: HTMLAttributes<HTMLHeadingElement>) {
  const { messages, unstyled } = useFeedbackUi();
  return (
    <h2
      {...props}
      className={classes(unstyled, "cf-board__title", props.className)}
    >
      {props.children ?? messages.board.title}
    </h2>
  );
}

/**
 * Props for `FeedbackBoard.Search`.
 */
export interface BoardSearchProps
  extends
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      "children" | "value" | "onChange"
    >,
    BoardSearchBaseProps {}

function BoardSearch({
  value,
  onValueChange,
  children,
  className,
  ...props
}: BoardSearchProps) {
  const { messages, unstyled } = useFeedbackUi();
  const state: BoardSearchState = { value, setValue: onValueChange };
  if (typeof children === "function") return <>{children(state)}</>;
  return (
    <input
      {...props}
      className={classes(unstyled, "cf-search", className)}
      value={value}
      onChange={(event) => onValueChange(event.currentTarget.value)}
      placeholder={props.placeholder ?? messages.board.searchPlaceholder}
    />
  );
}

function BoardList(props: HTMLAttributes<HTMLDivElement>) {
  const { unstyled } = useFeedbackUi();
  return (
    <div
      {...props}
      className={classes(unstyled, "cf-board__list", props.className)}
    />
  );
}

export const FeedbackBoard = {
  Root: BoardRoot,
  Header: BoardHeader,
  Title: BoardTitle,
  Search: BoardSearch,
  List: BoardList,
};

const EntryContext = createContext<FeedbackEntryData | null>(null);

function useEntryContext(): FeedbackEntryData {
  const entry = useContext(EntryContext);
  if (entry === null)
    throw new Error(
      "FeedbackEntry compound must be inside FeedbackEntry.Root.",
    );
  return entry;
}

/**
 * Props for `FeedbackEntry.Root`.
 */
export interface EntryRootProps
  extends HTMLAttributes<HTMLElement>, EntryRootBaseProps {}

function EntryRoot({ entry, className, ...props }: EntryRootProps) {
  const { unstyled } = useFeedbackUi();
  return (
    <EntryContext.Provider value={entry}>
      <article
        {...props}
        className={classes(unstyled, "cf-entry", className)}
      />
    </EntryContext.Provider>
  );
}

/**
 * Props for `FeedbackEntry.Upvote`.
 */
export interface EntryUpvoteProps
  extends
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "children" | "onClick" | "onToggle"
    >,
    EntryUpvoteBaseProps {}

function EntryUpvote({
  onToggle,
  children,
  "aria-label": accessibilityLabel,
  className,
  ...props
}: EntryUpvoteProps) {
  const entry = useEntryContext();
  const { messages, unstyled } = useFeedbackUi();
  const toggle = () => onToggle(!entry.viewerHasUpvoted);
  const state: EntryUpvoteState = {
    entry,
    active: entry.viewerHasUpvoted,
    count: entry.upvoteCount,
    toggle,
  };
  if (typeof children === "function") return <>{children(state)}</>;
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={classes(unstyled, "cf-upvote", className)}
      data-active={entry.viewerHasUpvoted ? "true" : "false"}
      aria-label={
        accessibilityLabel ??
        (entry.viewerHasUpvoted
          ? messages.entry.removeUpvote
          : messages.entry.upvote)
      }
      onClick={toggle}
    >
      {children ?? (
        <>
          <span aria-hidden="true">▲</span>
          <strong>{entry.upvoteCount}</strong>
        </>
      )}
    </button>
  );
}

function EntryContent(props: HTMLAttributes<HTMLDivElement>) {
  const { unstyled } = useFeedbackUi();
  return (
    <div
      {...props}
      className={classes(unstyled, "cf-entry__content", props.className)}
    />
  );
}

function EntryKind(props: HTMLAttributes<HTMLSpanElement>) {
  const entry = useEntryContext();
  const { messages, unstyled } = useFeedbackUi();

  return (
    <span
      {...props}
      className={classes(unstyled, "cf-entry__kind", props.className)}
    >
      {props.children ?? messages.kinds[entry.kind]}
    </span>
  );
}

function EntryTitle(props: HTMLAttributes<HTMLHeadingElement>) {
  const entry = useEntryContext();
  const { unstyled } = useFeedbackUi();
  return (
    <h3
      {...props}
      className={classes(unstyled, "cf-entry__title", props.className)}
    >
      {props.children ?? entry.title}
    </h3>
  );
}

function EntryBody(props: HTMLAttributes<HTMLParagraphElement>) {
  const entry = useEntryContext();
  const { unstyled } = useFeedbackUi();
  return (
    <p
      {...props}
      className={classes(unstyled, "cf-entry__body", props.className)}
    >
      {props.children ?? entry.body}
    </p>
  );
}

function EntryStatus(props: HTMLAttributes<HTMLSpanElement>) {
  const entry = useEntryContext();
  const { messages, unstyled } = useFeedbackUi();
  return (
    <span
      {...props}
      className={classes(unstyled, "cf-status", props.className)}
    >
      {props.children ?? messages.statuses[entry.status]}
    </span>
  );
}

function EntryCommentCount(props: HTMLAttributes<HTMLSpanElement>) {
  const entry = useEntryContext();
  const { messages, unstyled } = useFeedbackUi();
  return (
    <span
      {...props}
      className={classes(unstyled, "cf-entry__comments", props.className)}
    >
      {props.children ?? messages.entry.comments(entry.commentCount)}
    </span>
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
  const comment = useContext(CommentContext);
  if (comment === null)
    throw new Error("Comment compound must be inside Comment.Root.");
  return comment;
}

/**
 * Props for `Comment.Root`.
 */
export interface CommentRootProps
  extends HTMLAttributes<HTMLElement>, CommentRootBaseProps {}

function CommentRoot({ comment, className, ...props }: CommentRootProps) {
  const { unstyled } = useFeedbackUi();
  return (
    <CommentContext.Provider value={comment}>
      <article
        {...props}
        className={classes(unstyled, "cf-comment", className)}
      />
    </CommentContext.Provider>
  );
}

function CommentBody(props: HTMLAttributes<HTMLParagraphElement>) {
  const comment = useCommentContext();
  const { messages, unstyled } = useFeedbackUi();
  return (
    <p
      {...props}
      className={classes(unstyled, "cf-comment__body", props.className)}
    >
      {props.children ?? comment.body ?? messages.comments.deleted}
    </p>
  );
}

/**
 * Props for `Comment.Like`.
 */
export interface CommentLikeProps
  extends
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "children" | "onClick" | "onToggle"
    >,
    CommentLikeBaseProps {}

function CommentLike({
  onToggle,
  children,
  "aria-label": accessibilityLabel,
  className,
  ...props
}: CommentLikeProps) {
  const comment = useCommentContext();
  const { messages, unstyled } = useFeedbackUi();
  const toggle = () => onToggle(!comment.viewerHasLiked);
  const state: CommentLikeState = {
    comment,
    active: comment.viewerHasLiked,
    count: comment.likeCount,
    toggle,
  };
  if (typeof children === "function") return <>{children(state)}</>;
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={classes(unstyled, "cf-comment__like", className)}
      data-active={comment.viewerHasLiked ? "true" : "false"}
      aria-label={
        accessibilityLabel ??
        (comment.viewerHasLiked
          ? messages.comments.unlike
          : messages.comments.like)
      }
      onClick={toggle}
    >
      {children ?? (
        <>
          <span aria-hidden="true">{comment.viewerHasLiked ? "♥" : "♡"}</span>
          <span>{comment.likeCount}</span>
        </>
      )}
    </button>
  );
}

/**
 * Props for a simple comment action.
 */
export interface CommentActionProps
  extends
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "children" | "onClick" | "onToggle"
    >,
    CommentActionBaseProps {}

function CommentReply({
  onActivate,
  children,
  className,
  ...props
}: CommentActionProps) {
  const comment = useCommentContext();
  const { messages, unstyled } = useFeedbackUi();
  const state: CommentActionState = { comment, activate: onActivate };
  return typeof children === "function" ? (
    <>{children(state)}</>
  ) : (
    <button
      {...props}
      type={props.type ?? "button"}
      className={classes(unstyled, "cf-comment__action", className)}
      onClick={onActivate}
    >
      {children ?? messages.comments.reply}
    </button>
  );
}

/**
 * Props for `Comment.RepliesButton`.
 */
export interface RepliesButtonProps
  extends
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "children" | "onClick" | "onToggle"
    >,
    RepliesButtonBaseProps {}

function CommentRepliesButton({
  expanded,
  onExpandedChange,
  children,
  className,
  ...props
}: RepliesButtonProps) {
  const comment = useCommentContext();
  const { messages, unstyled } = useFeedbackUi();
  const activate = () => onExpandedChange(!expanded);
  const state: RepliesButtonState = {
    comment,
    expanded,
    count: comment.replyCount,
    activate,
  };
  if (typeof children === "function") return <>{children(state)}</>;
  if (comment.replyCount === 0) return null;
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={classes(unstyled, "cf-comment__replies", className)}
      onClick={activate}
    >
      {children ??
        (expanded
          ? messages.comments.hideReplies
          : messages.comments.viewReplies(comment.replyCount))}
    </button>
  );
}

function CommentChildren(props: HTMLAttributes<HTMLDivElement>) {
  const { unstyled } = useFeedbackUi();
  return (
    <div
      {...props}
      className={classes(unstyled, "cf-comment__children", props.className)}
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

function FormRoot(props: FormHTMLAttributes<HTMLFormElement>) {
  const { unstyled } = useFeedbackUi();
  return (
    <form
      {...props}
      className={classes(unstyled, "cf-form", props.className)}
    />
  );
}

function FormInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { unstyled } = useFeedbackUi();
  return (
    <input
      {...props}
      className={classes(unstyled, "cf-input", props.className)}
    />
  );
}

function FormTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { unstyled } = useFeedbackUi();
  return (
    <textarea
      {...props}
      className={classes(unstyled, "cf-textarea", props.className)}
    />
  );
}

function FormSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { unstyled } = useFeedbackUi();
  return (
    <select
      {...props}
      className={classes(unstyled, "cf-select", props.className)}
    />
  );
}

/**
 * Props for `FeedbackForm.Submit`.
 */
export interface FormSubmitProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    FormSubmitBaseProps {}

function FormSubmit({
  submitting = false,
  children,
  className,
  ...props
}: FormSubmitProps) {
  const { messages, unstyled } = useFeedbackUi();
  const state: FormSubmitState = { submitting };
  if (typeof children === "function") return <>{children(state)}</>;
  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      disabled={props.disabled ?? submitting}
      className={classes(unstyled, "cf-button cf-button--primary", className)}
    >
      {children ?? messages.form.submit}
    </button>
  );
}

export const FeedbackForm = {
  Root: FormRoot,
  Input: FormInput,
  Textarea: FormTextarea,
  Select: FormSelect,
  Submit: FormSubmit,
};
