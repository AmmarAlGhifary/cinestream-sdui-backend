import type { TmdbMovie, TmdbMovieDetail } from '../data/tmdb/dtos';
import {
    appBar,
    column,
    featuredHeroDetail,
    iconButton,
    movieCarousel,
    navigate,
    screen,
    sectionHeader,
    sectionHeaderDetail,
    share,
    text,
    textButton,
} from '../sdui/builders';
import type { Screen } from '../sdui/models';
import { APP_TITLE, backdropUrl, favoriteButton, toMovieCard } from './shared';

/**
 * @param movieId the `movie_id` query value, which is echoed into actions.
 * @param isFavorite whether the signed-in user saved this movie; false when signed out.
 */
export function buildMovieDetailScreen(
    movieId: string,
    movie: TmdbMovieDetail,
    similar: TmdbMovie[],
    isFavorite: boolean,
): Screen {
    return screen(
        "movie_detail_screen",
        column([
            featuredHeroDetail({
                image_url: backdropUrl(movie.backdrop_path),
                title: sectionHeader(movie.title),
                description1: text(`⭐ ${movie.vote_average.toFixed(1)}/10`),
                description2: text(`${movie.release_date}`),
                description3: text(`${movie.runtime} minutes`),
            }),
            sectionHeaderDetail("Overview"),
            text(movie.overview),
            sectionHeader(
                "Similar Movies",
                textButton(
                    "See All",
                    navigate("movie_list_screen", { list_type: "similar", movie_id: movieId }),
                ),
            ),
            movieCarousel("similar_carousel", similar.map(toMovieCard)),
        ]),
        appBar(APP_TITLE, [
            favoriteButton(movieId, isFavorite),
            iconButton("share", share(`Check out ${movie.title} on CineStream!`)),
        ]),
    );
}
