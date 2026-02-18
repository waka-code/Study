# Patrón Service Object

```ruby
# app/services/create_order_service.rb
class CreateOrderService
  def initialize(user, items)
    @user = user
    @items = items
  end
  
  def call
    ActiveRecord::Base.transaction do
      create_order
      update_inventory
      send_notification
      charge_payment
    end
    
    OpenStruct.new(success: true, order: @order)
  rescue => e
    Rails.logger.error("Order creation failed: #{e.message}")
    OpenStruct.new(success: false, error: e.message)
  end
  
  private
  
  def create_order
    @order = Order.create!(user: @user, items: @items)
  end
  
  def update_inventory
    @items.each { |item| item.product.decrement!(:stock, item.quantity) }
  end
  
  def send_notification
    OrderMailer.confirmation(@order).deliver_later
  end
  
  def charge_payment
    PaymentService.charge(@user, @order.total)
  end
end

# Controller
result = CreateOrderService.new(current_user, params[:items]).call
if result.success
  render json: result.order, status: :created
else
  render json: { error: result.error }, status: :unprocessable_entity
end
```

**Cuándo usar**:
- Lógica que involucra múltiples modelos
- Operaciones complejas de negocio
- Interacción con servicios externos
- Cuando un controller/modelo se vuelve muy grande
