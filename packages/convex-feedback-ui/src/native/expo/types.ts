import type { StackScreenProps } from "expo-router";
import type { ComponentType, ReactNode } from "react";
import type { ImageSourcePropType } from "react-native";
import type { SearchBarCommands } from "react-native-screens";
import type {
  FeedbackColorProps,
  FeedbackScreenRootProps,
  RoadmapScreenProps,
} from "../../shared/types";

/** Optional wrapper used around Expo Router bottom toolbars. */
export type BottomToolbarWrapper = ComponentType<{ children: ReactNode }>;

interface FeedbackScreenWithStack {
  useStack?: true;
  StackOptions?: StackScreenProps["options"];
  /** Android image sources for toolbar actions. iOS continues to use SF Symbols. */
  androidToolbarIcons?: FeedbackAndroidToolbarIcons;
  /** Optional component wrapping the bottom search/filter toolbar. */
  BottomToolbarWrapper?: BottomToolbarWrapper;
}
interface FeedbackScreenWithoutStack {
  useStack?: false;
  StackOptions?: never;
  androidToolbarIcons?: never;
  BottomToolbarWrapper?: never;
}
export type FeedbackScreenStackProps =
  FeedbackScreenWithStack | FeedbackScreenWithoutStack;

export type ExpoFeedbackScreenProps = FeedbackScreenStackProps &
  FeedbackScreenRootProps;

export interface FeedbackStackProps {
  searchRef: React.RefObject<SearchBarCommands | null>;
  stackOptions?: StackScreenProps["options"];
  androidToolbarIcons?: FeedbackAndroidToolbarIcons;
  /** Optional component wrapping the bottom search/filter toolbar. */
  BottomToolbarWrapper?: BottomToolbarWrapper;
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
  /** Android image source for the open/closed status filter. */
  filter?: ImageSourcePropType;
}

export interface RoadmapAndroidToolbarIcons {
  /** Android image source for back actions. */
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
  /** Optional component wrapping the bottom search/filter toolbar. */
  BottomToolbarWrapper?: BottomToolbarWrapper;
}

export interface FeedbackCreateStackLayoutProps {
  /** Options shared by the create form and suggested-entry screens. */
  screenOptions?: FeedbackStackScreenOptions;
  /** Create-form screen option overrides. */
  createOptions?: FeedbackStackScreenOptions;
  /** Suggested-entry screen option overrides. */
  entryOptions?: FeedbackStackScreenOptions;
}

/** File names used by the routed public roadmap stack. */
export interface RoadmapRouteNames {
  /** Board route. @default "index" */
  board: string;
  /** Roadmap item route. Must contain `[roadmapId]`. @default "[roadmapId]" */
  item: string;
}

export type RoadmapStackScreenOptions = Exclude<
  NonNullable<StackScreenProps["options"]>,
  (...args: never[]) => unknown
>;

export interface RoadmapStackLayoutProps extends RoadmapScreenProps {
  /** Partial overrides for the prescribed route file names. */
  routes?: Partial<RoadmapRouteNames>;
  /** Options shared by every roadmap screen. */
  screenOptions?: RoadmapStackScreenOptions;
  /** Roadmap board screen option overrides. */
  boardOptions?: RoadmapStackScreenOptions;
  /** Roadmap item screen option overrides. */
  itemOptions?: RoadmapStackScreenOptions;
  /** Android image sources for toolbar actions. iOS continues to use SF Symbols. */
  androidToolbarIcons?: RoadmapAndroidToolbarIcons;
}

export interface RoutedFeedbackContextValue {
  routes: FeedbackRouteNames;
  colors: FeedbackColorProps;
  androidToolbarIcons: FeedbackAndroidToolbarIcons;
  bottomToolbarWrapper?: BottomToolbarWrapper;
}

export interface RoutedRoadmapContextValue {
  routes: RoadmapRouteNames;
  colors: FeedbackColorProps;
  androidToolbarIcons: RoadmapAndroidToolbarIcons;
  pageSize: number;
  entryPageSize: number;
  onEntryOpen?: RoadmapScreenProps["onEntryOpen"];
  boardHeaderTransparent: boolean;
}
