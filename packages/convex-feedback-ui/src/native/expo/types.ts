import type { StackScreenProps } from "expo-router";
import type { ImageSourcePropType } from "react-native";
import type { SearchBarCommands } from "react-native-screens";
import type {
  FeedbackColorProps,
  FeedbackScreenRootProps,
} from "../../shared/types";

interface FeedbackScreenWithStack {
  useStack?: true;
  StackOptions?: StackScreenProps["options"];
  /** Android image sources for toolbar actions. iOS continues to use SF Symbols. */
  androidToolbarIcons?: FeedbackAndroidToolbarIcons;
}
interface FeedbackScreenWithoutStack {
  useStack?: false;
  StackOptions?: never;
  androidToolbarIcons?: never;
}
export type FeedbackScreenStackProps =
  FeedbackScreenWithStack | FeedbackScreenWithoutStack;

export type ExpoFeedbackScreenProps = FeedbackScreenStackProps &
  FeedbackScreenRootProps;

export interface FeedbackStackProps {
  searchRef: React.RefObject<SearchBarCommands | null>;
  stackOptions?: StackScreenProps["options"];
  androidToolbarIcons?: FeedbackAndroidToolbarIcons;
  children: React.ReactNode;
}

/** File names used by the routed feedback stack. */
export interface FeedbackRouteNames {
  /** Board route. @default "index" */
  board: string;
  /** Entry route. Must contain `[entryId]`. @default "[entryId]" */
  entry: string;
  /** Create-entry modal route. @default "new" */
  create: string;
}

export type FeedbackStackScreenOptions = Exclude<
  NonNullable<StackScreenProps["options"]>,
  (...args: never[]) => unknown
>;

export interface FeedbackAndroidToolbarIcons {
  /** Android image source for the create-entry action. */
  create?: ImageSourcePropType;
  /** Android image source for the back action. */
  back?: ImageSourcePropType;
  /** Android image source for modal close actions. */
  close?: ImageSourcePropType;
}

export interface FeedbackStackLayoutProps extends FeedbackScreenRootProps {
  /** Partial overrides for the prescribed route file names. */
  routes?: Partial<FeedbackRouteNames>;
  /** Options shared by every feedback screen. */
  screenOptions?: FeedbackStackScreenOptions;
  /** Board screen option overrides. */
  boardOptions?: FeedbackStackScreenOptions;
  /** Entry-detail screen option overrides. */
  entryOptions?: FeedbackStackScreenOptions;
  /** Create-entry modal option overrides. */
  createOptions?: FeedbackStackScreenOptions;
  /** Android image sources for toolbar actions. iOS continues to use SF Symbols. */
  androidToolbarIcons?: FeedbackAndroidToolbarIcons;
}

export interface FeedbackCreateStackLayoutProps {
  /** Options shared by the create form and suggested-entry screens. */
  screenOptions?: FeedbackStackScreenOptions;
  /** Create-form screen option overrides. */
  createOptions?: FeedbackStackScreenOptions;
  /** Suggested-entry screen option overrides. */
  entryOptions?: FeedbackStackScreenOptions;
}

export interface RoutedFeedbackContextValue {
  routes: FeedbackRouteNames;
  colors: FeedbackColorProps;
  androidToolbarIcons: FeedbackAndroidToolbarIcons;
}
