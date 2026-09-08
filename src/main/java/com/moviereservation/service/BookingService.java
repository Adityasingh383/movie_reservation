package com.moviereservation.service;

import com.moviereservation.dto.BookingRequest;
import com.moviereservation.dto.BookingResponse;
import com.moviereservation.entity.Booking;
import com.moviereservation.entity.SeatStatus;
import com.moviereservation.entity.ShowSeat;
import com.moviereservation.entity.User;
import com.moviereservation.exception.BookingNotFoundException;
import com.moviereservation.exception.SeatAlreadyBookedException;
import com.moviereservation.exception.SeatNotFoundException;
import com.moviereservation.exception.UserNotFoundException;
import com.moviereservation.repository.BookingRepository;
import com.moviereservation.repository.ShowSeatRepository;
import com.moviereservation.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ShowSeatRepository showSeatRepository;
    private final UserRepository userRepository;

    public BookingService(BookingRepository bookingRepository, ShowSeatRepository showSeatRepository,
                           UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.showSeatRepository = showSeatRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public BookingResponse bookSeat(String username, BookingRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));

        ShowSeat showSeat = showSeatRepository
                .findByShowIdAndSeatIdForUpdate(request.getShowId(), request.getSeatId())
                .orElseThrow(() -> new SeatNotFoundException("Seat not found for this show"));

        if (showSeat.getStatus() == SeatStatus.BOOKED) {
            throw new SeatAlreadyBookedException("This seat is already booked");
        }

        showSeat.setStatus(SeatStatus.BOOKED);
        showSeatRepository.save(showSeat);

        Booking booking = new Booking(user, showSeat, LocalDateTime.now());
        Booking savedBooking = bookingRepository.save(booking);

        return toBookingResponse(savedBooking);
    }

    public List<BookingResponse> getMyBookings(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));

        List<Booking> bookings = bookingRepository.findByUserId(user.getId());

        List<BookingResponse> response = new ArrayList<>();
        for (Booking booking : bookings) {
            response.add(toBookingResponse(booking));
        }
        return response;
    }

    public BookingResponse getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new BookingNotFoundException("Booking not found with id: " + id));
        return toBookingResponse(booking);
    }

    private BookingResponse toBookingResponse(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getShowSeat().getShow().getMovie().getTitle(),
                booking.getShowSeat().getShow().getStartTime(),
                booking.getShowSeat().getSeat().getSeatNumber(),
                booking.getBookingTime()
        );
    }
}
