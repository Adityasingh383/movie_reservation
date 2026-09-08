package com.moviereservation.config;

import com.moviereservation.entity.Role;
import com.moviereservation.entity.Seat;
import com.moviereservation.entity.User;
import com.moviereservation.repository.SeatRepository;
import com.moviereservation.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final SeatRepository seatRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(SeatRepository seatRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.seatRepository = seatRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (seatRepository.count() == 0) {
            String[] rows = {"A", "B", "C"};
            for (String row : rows) {
                for (int number = 1; number <= 5; number++) {
                    Seat seat = new Seat(row + number);
                    seatRepository.save(seat);
                }
            }
        }

        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = new User("admin", passwordEncoder.encode("admin123"), Role.ADMIN);
            userRepository.save(admin);
        }
    }
}
