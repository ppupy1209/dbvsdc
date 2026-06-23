package com.dbvsdc.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class DbvsdcApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(DbvsdcApiApplication.class, args);
    }
}
