import { getAccount, setFavorite } from '../data/tmdb/accountRepository';
import { logger } from '../logging/logger';
import { favoriteButton } from '../screens/shared';

/** Add the movie to, or remove it from, the signed-in user's favorites. */
export async function setMovieFavorite(sessionId: string, movieId: string, favorite: boolean) {
    const account = await getAccount(sessionId);
    await setFavorite(account.id, sessionId, movieId, favorite);

    logger.info(`Set favorite for movie ${movieId}`, { favorite });
    return {
        movie_id: movieId,
        is_favorite: favorite,
        icon_button: favoriteButton(movieId, favorite),
    };
}
