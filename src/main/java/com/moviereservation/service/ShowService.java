package com.moviereservation.service;

import com.moviereservation.dto.SeatResponse;
import com.moviereservation.dto.ShowRequest;
import com.moviereservation.entity.Movie;
import com.moviereservation.entity.Seat;
import com.moviereservation.entity.SeatStatus;
import com.moviereservation.entity.Show;
import com.moviereservation.entity.ShowSeat;
import com.moviereservation.exception.MovieNotFoundException;
import com.moviereservation.exception.ShowNotFoundException;
import com.moviereservation.repository.MovieRepository;
import com.moviereservation.repository.SeatRepository;
import com.moviereservation.repository.ShowRepository;
import com.moviereservation.repository.ShowSeatRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ShowService {

    private final ShowRepository showRepository;
    private final MovieRepository movieRepository;
    private final SeatRepository seatRepository;
    private final ShowSeatRepository showSeatRepository;

    public ShowService(ShowRepository showRepository, MovieRepository movieRepository,
                        SeatRepository seatRepository, ShowSeatRepository showSeatRepository) {
        this.showRepository = showRepository;
        this.movieRepository = movieRepository;
        this.seatRepository = seatRepository;
        this.showSeatRepository = showSeatRepository;
    }

    public Show createShow(ShowRequest request) {
        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new MovieNotFoundException("Movie not found with id: " + request.getMovieId()));

        Show show = new Show(movie, request.getStartTime(), request.getEndTime());
        Show savedShow = showRepository.save(show);

        List<Seat> allSeats = seatRepository.findAll();
        for (Seat seat : allSeats) {
            ShowSeat showSeat = new ShowSeat(savedShow, seat, SeatStatus.AVAILABLE);
            showSeatRepository.save(showSeat);
        }

        return savedShow;
    }

    public List<Show> getAllShows() {
        return showRepository.findAll();
    }

    public Show getShowById(Long id) {
        return showRepository.findById(id)
                .orElseThrow(() -> new ShowNotFoundException("Show not found with id: " + id));
    }

    public Show updateShow(Long id, ShowRequest request) {
        Show show = getShowById(id);
        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new MovieNotFoundException("Movie not found with id: " + request.getMovieId()));

        show.setMovie(movie);
        show.setStartTime(request.getStartTime());
        show.setEndTime(request.getEndTime());
        return showRepository.save(show);
    }

    public void deleteShow(Long id) {
        Show show = getShowById(id);
        showRepository.delete(show);
    }

    public List<SeatResponse> getSeatsForShow(Long showId) {
        Show show = getShowById(showId);
        List<ShowSeat> showSeats = showSeatRepository.findByShowId(show.getId());

        List<SeatResponse> response = new ArrayList<>();
        for (ShowSeat showSeat : showSeats) {
            SeatResponse seatResponse = new SeatResponse(
                    showSeat.getSeat().getId(),
                    showSeat.getSeat().getSeatNumber(),
                    showSeat.getStatus().name()
            );
            response.add(seatResponse);
        }
        return response;
    }
}
