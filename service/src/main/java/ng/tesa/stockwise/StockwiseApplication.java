package ng.tesa.stockwise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/** Stockwise: stock and customer credit for one small shop. */
@SpringBootApplication
@ConfigurationPropertiesScan
public class StockwiseApplication {

    public static void main(String[] args) {
        SpringApplication.run(StockwiseApplication.class, args);
    }
}
