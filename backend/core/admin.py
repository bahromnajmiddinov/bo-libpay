from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from user.models import CustomUser
from .models import Seller


class SellerInline(admin.StackedInline):
    model = Seller
    can_delete = False
    verbose_name_plural = 'Seller Profile'


class CustomUserAdmin(UserAdmin):
    inlines = (SellerInline,)


# Re-register UserAdmin
admin.site.register(CustomUser, CustomUserAdmin)


@admin.register(Seller)
class SellerAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'user', 'email', 'phone_number', 'created_at']
    list_filter = ['created_at']
    search_fields = ['business_name', 'user__username', 'email']
    readonly_fields = ['created_at', 'updated_at']