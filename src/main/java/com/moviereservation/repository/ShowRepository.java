package com.moviereservation.repository;

import com.moviereservation.entity.Show;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ShowRepository extends JpaRepository<Show, Long> {

    List<Show> findByMovieIdAndStartTimeLessThanAndEndTimeGreaterThan(
            Long movieId, LocalDateTime endTime, LocalDateTime startTime);

    boolean existsByMovieId(Long movieId);
}
