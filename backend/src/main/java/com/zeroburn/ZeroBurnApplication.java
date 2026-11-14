package com.zeroburn;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ZeroBurnApplication {

    public static void main(String[] args) {
        SpringApplication.run(ZeroBurnApplication.class, args);
    }
}
