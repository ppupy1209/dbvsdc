package com.dbvsdc.api.persistence.repository;

import com.dbvsdc.api.persistence.entity.AppConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppConfigRepository extends JpaRepository<AppConfig, String> {
}
