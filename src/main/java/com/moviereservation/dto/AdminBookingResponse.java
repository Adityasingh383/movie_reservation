package com.moviereservation.dto;

import java.time.LocalDateTime;

public class AdminBookingResponse {

    private Long bookingId;
    private String username;
    private String movieTitle;
    private LocalDateTime showTime;
    private String seatNumber;
    private LocalDateTime bookingTime;

    public AdminBookingResponse(Long bookingId, String username, String movieTitle,
                                LocalDateTime showTime, String seatNumber, LocalDateTime bookingTime) {
        this.bookingId = bookingId;
        this.username = username;
        this.movieTitle = movieTitle;
        this.showTime = showTime;
        this.seatNumber = seatNumber;
        this.bookingTime = bookingTime;
    }

    public Long getBookingId() {
        return bookingId;
    }

    public void setBookingId(Long bookingId) {
        this.bookingId = bookingId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public LocalDateTime getShowTime() {
        return showTime;
    }

    public void setShowTime(LocalDateTime showTime) {
        this.showTime = showTime;
    }

    public String getSeatNumber() {
        return seatNumber;
    }

    public void setSeatNumber(String seatNumber) {
        this.seatNumber = seatNumber;
    }

    public LocalDateTime getBookingTime() {
        return bookingTime;
    }

    public void setBookingTime(LocalDateTime bookingTime) {
        this.bookingTime = bookingTime;
    }
}
