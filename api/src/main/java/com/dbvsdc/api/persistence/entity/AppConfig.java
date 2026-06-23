package com.dbvsdc.api.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_config")
public class AppConfig {

    @Id
    @Column(name = "cfg_key", length = 40)
    private String cfgKey;

    @Column(name = "cfg_value", length = 100, nullable = false)
    private String cfgValue;

    protected AppConfig() {
    }

    public AppConfig(String cfgKey, String cfgValue) {
        this.cfgKey = cfgKey;
        this.cfgValue = cfgValue;
    }

    public String getCfgKey() {
        return cfgKey;
    }

    public String getCfgValue() {
        return cfgValue;
    }
}
