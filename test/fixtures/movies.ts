/** Hand-written TMDB-shaped data. All titles, ids and image paths are made up. */

export const movie = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    title: `Movie ${id}`,
    overview: `Overview of movie ${id}.`,
    poster_path: `/poster-${id}.jpg`,
    backdrop_path: `/backdrop-${id}.jpg`,
    vote_average: 7.25,
    release_date: '2026-01-15',
    ...overrides,
});

const range = (from: number, count: number) => Array.from({ length: count }, (_, i) => movie(from + i));

/**
 * 12 results: one hero plus 11 more, one more than the home carousel keeps.
 * The second has `name` instead of `title`; the third has no poster.
 */
export const trending = {
    results: [
        movie(100),
        movie(101, { title: undefined, name: 'Named Only' }),
        movie(102, { poster_path: null }),
        ...range(103, 9),
    ],
};

/** 11 results, one more than the home carousel keeps. */
export const upcoming = { results: range(200, 11) };

/** 11 results, one more than the detail carousel keeps. */
export const similar = { results: range(300, 11) };

export const movieDetail = movie(42, {
    title: 'The Answer',
    vote_average: 8.456,
    runtime: 118,
});

/** Covers the search screen's fallbacks for missing poster, rating and date. */
export const searchResults = {
    results: [
        movie(400),
        movie(401, { poster_path: null, vote_average: undefined, release_date: '' }),
        movie(402, { title: undefined, name: 'Named Only', vote_average: 0 }),
    ],
};
