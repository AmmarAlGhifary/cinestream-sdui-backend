/**
 * Small constructors for SDUI components. Optional properties are omitted
 * entirely (never set to `undefined`) when not supplied.
 */
import type {
    Action,
    ApiAction,
    AppBar,
    Button,
    Column,
    ColumnChild,
    FeaturedHero,
    FeaturedHeroDetail,
    IconButton,
    MovieCard,
    MovieCarousel,
    MovieListItem,
    NavigationAction,
    Screen,
    SectionHeader,
    SectionHeaderDetail,
    ShareAction,
    Text,
    TextButton,
    VerticalList,
} from './models';

export function screen(screenId: Screen["screen_id"], body: Screen["body"], toolbar?: AppBar): Screen {
    return {
        type: "screen",
        screen_id: screenId,
        ...(toolbar && { toolbar }),
        body,
    };
}

export function appBar(title: string, actions: IconButton[] = []): AppBar {
    return {
        type: "app_bar",
        title: {
            type: "toolbar_title",
            text_content: title,
            alignment: "start",
            style: "headline",
        },
        actions,
    };
}

export function text(content: string): Text {
    return { type: "text", text_content: content };
}

export function navigate(
    destination: NavigationAction["destination"],
    params?: NavigationAction["params"],
): NavigationAction {
    return {
        type: "navigation_action",
        destination,
        ...(params && { params }),
    };
}

export function apiPost(endpoint: string, body: ApiAction["body"]): ApiAction {
    return { type: "api_action", endpoint, method: "POST", body };
}

export function share(content: string): ShareAction {
    return { type: "share_action", content };
}

export function button(label: string, action: Action): Button {
    return { type: "button", text: label, style: "primary", action };
}

export function textButton(label: string, action: Action): TextButton {
    return { type: "text_button", text: label, action };
}

export function iconButton(iconName: IconButton["icon_name"], action: Action): IconButton {
    return { type: "icon_button", icon_name: iconName, action };
}

export function sectionHeader(title: string, actionButton?: TextButton): SectionHeader {
    return {
        type: "section_header",
        title: text(title),
        ...(actionButton && { action_button: actionButton }),
    };
}

export function sectionHeaderDetail(title: string): SectionHeaderDetail {
    return { type: "section_header_detail", title: text(title) };
}

export function featuredHero(props: Omit<FeaturedHero, "type">): FeaturedHero {
    return { type: "featured_hero", ...props };
}

export function featuredHeroDetail(props: Omit<FeaturedHeroDetail, "type">): FeaturedHeroDetail {
    return { type: "featured_hero_detail", ...props };
}

export function movieCard(movieId: string, posterUrl: string, title: string): MovieCard {
    return {
        type: "movie_card",
        movie_id: movieId,
        poster_url: posterUrl,
        title: text(title),
        action: navigate("movie_detail_screen", { movie_id: movieId }),
    };
}

export function movieCarousel(carouselId: string, items: MovieCard[]): MovieCarousel {
    return { type: "movie_carousel", carousel_id: carouselId, item_type: "movie_card", items };
}

export function movieListItem(movieId: string, posterUrl: string, title: string, subtitle: string): MovieListItem {
    return {
        type: "movie_list_item",
        movie_id: movieId,
        poster_url: posterUrl,
        title: text(title),
        subtitle: text(subtitle),
        action: navigate("movie_detail_screen", { movie_id: movieId }),
    };
}

export function column(children: ColumnChild[]): Column {
    return { type: "column", children };
}

export function verticalList(listId: string, items: MovieListItem[]): VerticalList {
    return { type: "vertical_list", list_id: listId, items };
}
