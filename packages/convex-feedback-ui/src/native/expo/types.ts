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
  colors?: FeedbackColorProps;
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
  /** Edit-entry route nested under the entry route. @default "[entryId]/edit" */
  edit: string;
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
  /** Android image source for the edit-entry action. */
  edit?: ImageSourcePropType;
  /** Android image source for the save-entry action. */
  save?: ImageSourcePropType;
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
  /** Edit-entry screen option overrides. */
  editOptions?: FeedbackStackScreenOptions;
  /** Create-entry modal option overrides. */
  createOptions?: FeedbackStackScreenOptions;
  /** Android image sources for toolbar actions. iOS continues to use SF Symbols. */
  androidToolbarIcons?: FeedbackAndroidToolbarIcons;
  /** Optional component wrapping the bottom search/filter toolbar. */
  BottomToolbarWrapper?: BottomToolbarWrapper;
}

export interface FeedbackCreateStackLayoutProps {
  /** Options shared by the create form screen. */
  screenOptions?: FeedbackStackScreenOptions;
  /** Create-form screen option overrides. */
  createOptions?: FeedbackStackScreenOptions;
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
  /**
   * Total top space reserved for the board beneath a transparent stack
   * header. Defaults to the measured native-stack header height, with an
   * iOS/Android fallback when the header context is unavailable. When
   * `headerTransparent` is `false`, the native stack already lays the board
   * below the header and the default is `0`. `0` disables the automatic top
   * inset.
   */
  topInset?: number;
  /**
   * Total bottom space reserved for a host navigation bar or overlay. Defaults
   * to the bottom safe area, plus the built-in iOS bottom search toolbar when
   * that toolbar is rendered. `0` disables the automatic bottom inset.
   */
  bottomInset?: number;
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
  /** Explicit top space forwarded from the routed stack layout. */
  topInset?: number;
  /** Explicit total bottom space forwarded from the routed stack layout. */
  bottomInset?: number;
}
