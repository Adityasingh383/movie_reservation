package com.moviereservation.dto;

public class SeatResponse {

    private Long seatId;
    private String seatNumber;
    private String status;

    public SeatResponse(Long seatId, String seatNumber, String status) {
        this.seatId = seatId;
        this.seatNumber = seatNumber;
        this.status = status;
    }

    public Long getSeatId() {
        return seatId;
    }

    public void setSeatId(Long seatId) {
        this.seatId = seatId;
    }

    public String getSeatNumber() {
        return seatNumber;
    }

    public void setSeatNumber(String seatNumber) {
        this.seatNumber = seatNumber;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
