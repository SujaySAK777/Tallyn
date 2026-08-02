package com.example.PaymentProcessing.api;

import java.util.List;
import org.springframework.data.domain.Page;

public class PaymentSearchResponse {
    private List<PaymentResponse> items;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    public static PaymentSearchResponse fromPage(Page<PaymentResponse> page) {
        PaymentSearchResponse response = new PaymentSearchResponse();
        response.setItems(page.getContent());
        response.setPage(page.getNumber());
        response.setSize(page.getSize());
        response.setTotalElements(page.getTotalElements());
        response.setTotalPages(page.getTotalPages());
        return response;
    }

    public List<PaymentResponse> getItems() {
        return items;
    }

    public void setItems(List<PaymentResponse> items) {
        this.items = items;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }
}
