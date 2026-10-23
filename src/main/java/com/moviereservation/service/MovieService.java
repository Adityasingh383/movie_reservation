package com.moviereservation.service;

import com.moviereservation.dto.MovieRequest;
import com.moviereservation.entity.Movie;
import com.moviereservation.exception.MovieNotFoundException;
import com.moviereservation.repository.MovieRepository;
import com.moviereservation.repository.ShowRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MovieService {

    private final MovieRepository movieRepository;
    private final ShowRepository showRepository;

    public MovieService(MovieRepository movieRepository, ShowRepository showRepository) {
        this.movieRepository = movieRepository;
        this.showRepository = showRepository;
    }

    public Movie createMovie(MovieRequest request) {
        Movie movie = new Movie(request.getTitle(), request.getDescription(), request.getDuration(), request.getGenre());
        return movieRepository.save(movie);
    }

    public List<Movie> getAllMovies() {
        return movieRepository.findAll();
    }

    public Movie getMovieById(Long id) {
        return movieRepository.findById(id)
                .orElseThrow(() -> new MovieNotFoundException("Movie not found with id: " + id));
    }

    public Movie updateMovie(Long id, MovieRequest request) {
        Movie movie = getMovieById(id);
        movie.setTitle(request.getTitle());
        movie.setDescription(request.getDescription());
        movie.setDuration(request.getDuration());
        movie.setGenre(request.getGenre());
        return movieRepository.save(movie);
    }

    public void deleteMovie(Long id) {
        Movie movie = getMovieById(id);
        if (showRepository.existsByMovieId(id)) {
            throw new IllegalArgumentException("Cannot delete a movie with scheduled shows");
        }
        movieRepository.delete(movie);
    }
}
