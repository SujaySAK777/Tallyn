package com.example.PaymentProcessing.repository;
import com.example.PaymentProcessing.model.Customer;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByEmail(String email);
    Optional<Customer> findByPhoneNumber(String phoneNumber);   // ADD THIS LINE
}