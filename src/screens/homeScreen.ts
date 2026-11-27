import type { TmdbMovie } from '../data/tmdb/dtos';
import {
    appBar,
    button,
    column,
    featuredHero,
    iconButton,
    movieCarousel,
    navigate,
    screen,
    sectionHeader,
    text,
    textButton,
} from '../sdui/builders';
import type { Screen } from '../sdui/models';
import { APP_TITLE, backdropUrl, displayTitle, toMovieCard } from './shared';

export interface HomeContent {
    hero: TmdbMovie;
    trending: TmdbMovie[];
    upcoming: TmdbMovie[];
}

function seeAll(listType: "trending" | "upcoming") {
    return textButton("See All", navigate("movie_list_screen", { list_type: listType }));
}

export function buildHomeScreen({ hero, trending, upcoming }: HomeContent): Screen {
    return screen(
        "home",
        column([
            featuredHero({
                image_url: backdropUrl(hero.backdrop_path),
                title: sectionHeader(displayTitle(hero)),
                description: text(hero.overview),
                buttons: [
                    button("View Details", navigate("movie_detail_screen", { movie_id: hero.id.toString() })),
                ],
            }),
            sectionHeader("This Week!", seeAll("trending")),
            movieCarousel("trending_carousel", trending.map(toMovieCard)),
            sectionHeader("Coming Soon", seeAll("upcoming")),
            movieCarousel("upcoming_carousel", upcoming.map(toMovieCard)),
        ]),
        appBar(APP_TITLE, [iconButton("search", navigate("search_screen"))]),
    );
}
