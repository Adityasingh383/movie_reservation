package com.moviereservation.repository;

import com.moviereservation.entity.ShowSeat;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ShowSeatRepository extends JpaRepository<ShowSeat, Long> {

    List<ShowSeat> findByShowId(Long showId);

    boolean existsByShowIdAndSeatId(Long showId, Long seatId);

    void deleteByShowId(Long showId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ss FROM ShowSeat ss WHERE ss.show.id = :showId AND ss.seat.id = :seatId")
    Optional<ShowSeat> findByShowIdAndSeatIdForUpdate(@Param("showId") Long showId, @Param("seatId") Long seatId);
}
