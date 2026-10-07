package vn.shoegroup.catalog;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/{type:categories|brands|materials|colors|sizes}")
public class CatalogController {
    private final CatalogService service;
    public CatalogController(CatalogService service) { this.service = service; }
    @GetMapping public List<Map<String, Object>> list(@PathVariable String type) { return service.list(type); }
    @PostMapping public Map<String, Object> create(@PathVariable String type, @RequestBody Map<String, Object> body) { return service.save(type, null, body); }
    @PutMapping("/{id}") public Map<String, Object> update(@PathVariable String type, @PathVariable String id, @RequestBody Map<String, Object> body) { return service.save(type, id, body); }
    @DeleteMapping("/{id}") public Map<String, Object> delete(@PathVariable String type, @PathVariable String id) { return service.delete(type, id); }
}
