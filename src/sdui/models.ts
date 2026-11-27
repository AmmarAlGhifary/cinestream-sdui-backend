/**
 * The SDUI JSON contract consumed by the Android client. Property names, values
 * and the order in which builders emit them are part of that contract.
 */

// Actions

export interface NavigationAction {
    type: "navigation_action";
    destination: "search_screen" | "movie_detail_screen" | "movie_list_screen";
    params?: Record<string, string>;
}

export interface ApiAction {
    type: "api_action";
    endpoint: string;
    method: "POST";
    body: {
        /** Passed through from the query string, so repeated parameters stay an array. */
        movie_id: string | string[];
    };
}

export interface ShareAction {
    type: "share_action";
    content: string;
}

export type Action = NavigationAction | ApiAction | ShareAction;

// Basic components

export interface Text {
    type: "text";
    text_content: string;
}

export interface Button {
    type: "button";
    text: string;
    style: "primary";
    action: Action;
}

export interface TextButton {
    type: "text_button";
    text: string;
    action: Action;
}

export interface IconButton {
    type: "icon_button";
    icon_name: "search" | "favorite_border" | "share";
    action: Action;
}

// Toolbar

export interface ToolbarTitle {
    type: "toolbar_title";
    text_content: string;
    alignment: "start";
    style: "headline";
}

export interface AppBar {
    type: "app_bar";
    title: ToolbarTitle;
    actions: IconButton[];
}

// Content components

export interface SectionHeader {
    type: "section_header";
    title: Text;
    action_button?: TextButton;
}

export interface SectionHeaderDetail {
    type: "section_header_detail";
    title: Text;
}

export interface FeaturedHero {
    type: "featured_hero";
    image_url: string;
    title: SectionHeader;
    description: Text;
    buttons: Button[];
}

export interface FeaturedHeroDetail {
    type: "featured_hero_detail";
    image_url: string;
    title: SectionHeader;
    description1: Text;
    description2: Text;
    description3: Text;
}

export interface MovieCard {
    type: "movie_card";
    movie_id: string;
    poster_url: string;
    title: Text;
    action: NavigationAction;
}

export interface MovieCarousel {
    type: "movie_carousel";
    carousel_id: string;
    item_type: "movie_card";
    items: MovieCard[];
}

export interface MovieListItem {
    type: "movie_list_item";
    movie_id: string;
    poster_url: string;
    title: Text;
    subtitle: Text;
    action: NavigationAction;
}

export interface VerticalList {
    type: "vertical_list";
    list_id: string;
    items: MovieListItem[];
}

export type ColumnChild = FeaturedHero | FeaturedHeroDetail | SectionHeader | SectionHeaderDetail | Text | MovieCarousel;

export interface Column {
    type: "column";
    children: ColumnChild[];
}

// Root

export interface Screen {
    type: "screen";
    screen_id: "home" | "movie_detail_screen" | "movie_list_screen" | "search_screen";
    toolbar?: AppBar;
    body: Column | VerticalList;
}
