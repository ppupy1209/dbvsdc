package com.dbvsdc.api.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "sync_log")
public class SyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source", length = 40, nullable = false)
    private String source;

    @Column(name = "ran_at", nullable = false)
    private LocalDateTime ranAt;

    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @Column(name = "rows_cnt")
    private Integer rowsCnt;

    @Column(name = "message", length = 255)
    private String message;

    protected SyncLog() {
    }

    public SyncLog(String source, LocalDateTime ranAt, String status, Integer rowsCnt, String message) {
        this.source = source;
        this.ranAt = ranAt;
        this.status = status;
        this.rowsCnt = rowsCnt;
        this.message = message;
    }

    public Long getId() {
        return id;
    }
}
